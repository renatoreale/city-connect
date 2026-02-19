import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RoleType } from '../../common/constants/roles.constant';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      relations: ['permissions'],
      order: { hierarchy: 'DESC' },
    });
  }

  async findById(id: string): Promise<Role | null> {
    return this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
  }

  async findByCode(code: RoleType): Promise<Role | null> {
    return this.rolesRepository.findOne({
      where: { code },
      relations: ['permissions'],
    });
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionsRepository.find({
      order: { module: 'ASC', name: 'ASC' },
    });
  }

  async getPermissionsByModule(module: string): Promise<Permission[]> {
    return this.permissionsRepository.find({
      where: { module },
      order: { name: 'ASC' },
    });
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Ruolo non trovato');
    }

    const permission = await this.permissionsRepository.findOne({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permesso non trovato');
    }

    if (!role.permissions.find((p) => p.id === permissionId)) {
      role.permissions.push(permission);
      await this.rolesRepository.save(role);
    }

    return role;
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Ruolo non trovato');
    }

    role.permissions = role.permissions.filter((p) => p.id !== permissionId);
    return this.rolesRepository.save(role);
  }

  async hasPermission(roleId: string, permissionCode: string): Promise<boolean> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) return false;

    return role.permissions.some((p) => p.code === permissionCode);
  }
}
