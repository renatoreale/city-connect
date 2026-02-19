import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserTenant } from './entities/user-tenant.entity';
import { CreateUserDto, UpdateUserDto, AssignTenantDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
  ) {}

  private sanitizeUser(user: User): Record<string, any> {
    const { password, ...sanitized } = user as any;
    return sanitized;
  }

  private sanitizeUsers(users: User[]): Record<string, any>[] {
    return users.map((user) => this.sanitizeUser(user));
  }

  async findAll(options?: {
    tenantId?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }): Promise<{ data: Record<string, any>[]; total: number }> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userTenants', 'userTenant')
      .leftJoinAndSelect('userTenant.tenant', 'tenant')
      .leftJoinAndSelect('userTenant.role', 'role');

    if (options?.tenantId) {
      queryBuilder.andWhere('userTenant.tenant_id = :tenantId', {
        tenantId: options.tenantId,
      });
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('user.is_active = :isActive', {
        isActive: options.isActive,
      });
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getManyAndCount();

    return { data: this.sanitizeUsers(data), total };
  }

  async findById(id: string): Promise<Record<string, any> | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['userTenants', 'userTenants.tenant', 'userTenants.role'],
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async findByEmail(email: string): Promise<Record<string, any> | null> {
    const user = await this.findByEmailInternal(email);
    return user ? this.sanitizeUser(user) : null;
  }

  async findByEmailInternal(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['userTenants', 'userTenants.tenant', 'userTenants.role'],
    });
  }

  async create(createUserDto: CreateUserDto): Promise<Record<string, any>> {
    const existingUser = await this.findByEmailInternal(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email già registrata');
    }

    const user = this.usersRepository.create(createUserDto);
    const savedUser = await this.usersRepository.save(user);
    return this.sanitizeUser(savedUser);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<Record<string, any>> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['userTenants', 'userTenants.tenant', 'userTenants.role'],
    });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmailInternal(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email già in uso');
      }
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.usersRepository.save(user);
    return this.sanitizeUser(savedUser);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    await this.usersRepository.softDelete(id);
  }

  async assignToTenant(
    userId: string,
    assignTenantDto: AssignTenantDto,
  ): Promise<UserTenant> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    const existingAssignment = await this.userTenantRepository.findOne({
      where: {
        userId,
        tenantId: assignTenantDto.tenantId,
      },
    });

    if (existingAssignment) {
      existingAssignment.roleId = assignTenantDto.roleId;
      existingAssignment.isActive = assignTenantDto.isActive ?? true;
      return this.userTenantRepository.save(existingAssignment);
    }

    const userTenant = this.userTenantRepository.create({
      userId,
      tenantId: assignTenantDto.tenantId,
      roleId: assignTenantDto.roleId,
      isActive: assignTenantDto.isActive ?? true,
    });

    return this.userTenantRepository.save(userTenant);
  }

  async removeFromTenant(userId: string, tenantId: string): Promise<void> {
    const userTenant = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!userTenant) {
      throw new NotFoundException('Assegnazione non trovata');
    }

    await this.userTenantRepository.remove(userTenant);
  }

  async getUserTenants(userId: string): Promise<UserTenant[]> {
    return this.userTenantRepository.find({
      where: { userId, isActive: true },
      relations: ['tenant', 'role'],
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      user.lastLogin = new Date();
      await this.usersRepository.save(user);
    }
  }
}
