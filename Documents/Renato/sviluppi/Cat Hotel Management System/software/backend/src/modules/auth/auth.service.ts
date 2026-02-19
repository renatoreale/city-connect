import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';
import { RoleType, GLOBAL_ROLES } from '../../common/constants/roles.constant';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult extends TokenPair {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenants: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmailInternal(email);

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const userTenants = await this.usersService.getUserTenants(user.id);

    let primaryRole = RoleType.OPERATORE;
    let tenantIds: string[] = [];

    if (user.isGlobalUser) {
      const adminTenant = userTenants.find(
        (ut) => ut.role.code === RoleType.ADMIN || ut.role.code === RoleType.CEO,
      );
      primaryRole = adminTenant?.role.code || RoleType.ADMIN;
    } else if (userTenants.length > 0) {
      const sortedTenants = userTenants.sort(
        (a, b) => b.role.hierarchy - a.role.hierarchy,
      );
      primaryRole = sortedTenants[0].role.code;
      tenantIds = userTenants.map((ut) => ut.tenantId);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: primaryRole,
      tenantIds,
      currentTenantId: tenantIds[0],
      isGlobalUser: user.isGlobalUser,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(
      user.id,
      tenantIds[0],
      ipAddress,
      userAgent,
    );

    await this.usersService.updateLastLogin(user.id);

    const tenantsInfo = userTenants.map((ut) => ({
      id: ut.tenantId,
      name: ut.tenant.name,
      role: ut.role.code,
    }));

    return {
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: this.getAccessTokenExpirationSeconds(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: primaryRole,
        tenants: tenantsInfo,
      },
    };
  }

  async refresh(
    refreshTokenValue: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: {
        token: refreshTokenValue,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!refreshToken || !refreshToken.user) {
      throw new UnauthorizedException('Refresh token non valido o scaduto');
    }

    if (!refreshToken.user.isActive) {
      throw new UnauthorizedException('Utente disattivato');
    }

    await this.refreshTokenRepository.update(refreshToken.id, { isRevoked: true });

    const userTenants = await this.usersService.getUserTenants(refreshToken.userId);

    let primaryRole = RoleType.OPERATORE;
    let tenantIds: string[] = [];

    if (refreshToken.user.isGlobalUser) {
      const adminTenant = userTenants.find(
        (ut) => ut.role.code === RoleType.ADMIN || ut.role.code === RoleType.CEO,
      );
      primaryRole = adminTenant?.role.code || RoleType.ADMIN;
    } else if (userTenants.length > 0) {
      const sortedTenants = userTenants.sort(
        (a, b) => b.role.hierarchy - a.role.hierarchy,
      );
      primaryRole = sortedTenants[0].role.code;
      tenantIds = userTenants.map((ut) => ut.tenantId);
    }

    const payload: JwtPayload = {
      sub: refreshToken.userId,
      email: refreshToken.user.email,
      role: primaryRole,
      tenantIds,
      currentTenantId: refreshToken.tenantId || tenantIds[0],
      isGlobalUser: refreshToken.user.isGlobalUser,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.createRefreshToken(
      refreshToken.userId,
      refreshToken.tenantId,
      ipAddress,
      userAgent,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken.token,
      expiresIn: this.getAccessTokenExpirationSeconds(),
    };
  }

  async logout(userId: string, refreshTokenValue?: string): Promise<void> {
    if (refreshTokenValue) {
      await this.refreshTokenRepository.update(
        { token: refreshTokenValue, userId },
        { isRevoked: true },
      );
    } else {
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  private async createRefreshToken(
    userId: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const token = randomUUID() + randomUUID();
    const expiresAt = this.getRefreshTokenExpiration();

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      tenantId,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  private getAccessTokenExpirationSeconds(): number {
    const expiration = this.configService.get<string>('jwt.accessExpiration') || '15m';
    return this.parseExpirationToSeconds(expiration);
  }

  private getRefreshTokenExpiration(): Date {
    const expiration = this.configService.get<string>('jwt.refreshExpiration') || '7d';
    const seconds = this.parseExpirationToSeconds(expiration);
    return new Date(Date.now() + seconds * 1000);
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }
}
