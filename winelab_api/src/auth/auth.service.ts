import { BadRequestException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { LoginDto } from './dto/login.dto';
import { PERMISSION_CATEGORIES, SystemPermission } from './permissions';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    permissions: string[];
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        permissions: string[];
    };
}

type AuthenticatedUser = User & {
    role: {
        name: string;
        permissions: {
            permission: {
                code: string;
            };
        }[];
    } | null;
};

@Injectable()
export class AuthService implements OnModuleInit {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private prisma: PrismaService,
    ) { }

    async onModuleInit() {
        try {
            await this.syncSystemRoles();
        } catch (error) {
            this.logger.error('Failed to sync system roles', error instanceof Error ? error.stack : undefined);
        }
    }

    async login(loginDto: LoginDto): Promise<TokenResponse> {
        const user = await this.usersService.findByEmail(loginDto.email);

        if (!user) {
            throw new UnauthorizedException('Неверный email или пароль');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Аккаунт деактивирован');
        }

        if (!user.role) {
            throw new UnauthorizedException('Пользователь не имеет назначенной роли');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Неверный email или пароль');
        }

        return this.buildTokenResponse(user);
    }

    async refresh(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            const user = await this.usersService.findById(payload.sub);

            if (!user || !user.isActive) {
                throw new UnauthorizedException('Недействительный токен');
            }

            if (!user.role) {
                throw new UnauthorizedException('Пользователь не имеет назначенной роли');
            }

            const permissions = user.role.permissions.map((p) => p.permission.code);

            const newPayload: JwtPayload = {
                sub: user.id,
                email: user.email,
                role: user.role.name,
                permissions,
            };

            return {
                accessToken: this.jwtService.sign(newPayload),
            };
        } catch {
            throw new UnauthorizedException('Недействительный refresh token');
        }
    }

    async validateUser(payload: JwtPayload) {
        const user = await this.usersService.findById(payload.sub);

        if (!user || !user.isActive) {
            return null;
        }

        const permissions = user.role?.permissions.map((p) => p.permission.code) || [];

        return {
            ...user,
            role: user.role?.name,
            permissions,
        };
    }

    async getBootstrapStatus() {
        const userCount = await this.prisma.user.count();

        return {
            requiresSetup: userCount === 0,
            userCount,
        };
    }

    async bootstrapAdmin(dto: BootstrapAdminDto): Promise<TokenResponse> {
        const user = await this.prisma.$transaction(async (tx) => {
            const userCount = await tx.user.count();
            if (userCount > 0) {
                throw new BadRequestException('Первый администратор уже создан');
            }

            await this.ensureBasePermissionsAndRoles(tx);

            const adminRole = await tx.role.findUnique({
                where: { name: 'ADMIN' },
            });

            if (!adminRole) {
                throw new BadRequestException('Не удалось подготовить роль администратора');
            }

            const hashedPassword = await bcrypt.hash(dto.password, 10);

            await tx.user.create({
                data: {
                    email: dto.email,
                    password: hashedPassword,
                    name: dto.name,
                    phone: dto.phone,
                    roleId: adminRole.id,
                    isActive: true,
                },
            });

            return tx.user.findUniqueOrThrow({
                where: { email: dto.email },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        return this.buildTokenResponse(user);
    }

    private async syncSystemRoles() {
        await this.prisma.$transaction(async (tx) => {
            await this.ensureBasePermissionsAndRoles(tx);
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
    }

    private async ensureBasePermissionsAndRoles(tx: Prisma.TransactionClient) {
        const permissions = Object.values(SystemPermission);

        for (const code of permissions) {
            const category = PERMISSION_CATEGORIES[code] || 'Other';
            const description = `Permission to ${code.split('_')[1].toLowerCase()} ${category.toLowerCase()}`;

            await tx.permission.upsert({
                where: { code },
                update: { category, description },
                create: { code, category, description },
            });
        }

        const warehousePermissions = permissions.filter((permission) =>
            ['WAREHOUSE', 'STOCK', 'SHIPMENT', 'RECEIVING', 'ASSET', 'DELIVERY', 'PRODUCT'].some((prefix) =>
                permission.startsWith(prefix),
            ) || permission.startsWith('REQUEST'),
        );

        const supportPermissions = [
            SystemPermission.STORE_READ,
            SystemPermission.PRODUCT_READ,
            SystemPermission.REQUEST_READ,
            SystemPermission.REQUEST_CREATE,
        ];

        const legacyUserRole = await tx.role.findUnique({
            where: { name: 'USER' },
        });

        const supportRole = await tx.role.findUnique({
            where: { name: 'SUPPORT' },
        });

        if (legacyUserRole && !supportRole) {
            await tx.role.update({
                where: { id: legacyUserRole.id },
                data: {
                    name: 'SUPPORT',
                    description: 'Technical Support',
                    isSystem: true,
                },
            });
        }

        const roleConfigs = [
            { name: 'ADMIN', description: 'Administrator', permissions, isSystem: true },
            {
                name: 'MANAGER',
                description: 'Manager',
                permissions: permissions.filter((permission) =>
                    permission !== SystemPermission.USER_DELETE &&
                    permission !== SystemPermission.ROLE_DELETE &&
                    permission !== SystemPermission.SHIPMENT_DELETE &&
                    permission !== SystemPermission.CATEGORY_MANAGE,
                ),
                isSystem: true,
            },
            {
                name: 'WAREHOUSE',
                description: 'Warehouse Worker',
                permissions: warehousePermissions,
                isSystem: true,
            },
            {
                name: 'SUPPORT',
                description: 'Technical Support',
                permissions: supportPermissions,
                isSystem: true,
            },
        ];

        for (const roleConfig of roleConfigs) {
            const role = await tx.role.upsert({
                where: { name: roleConfig.name },
                update: {
                    description: roleConfig.description,
                    isSystem: roleConfig.isSystem,
                },
                create: {
                    name: roleConfig.name,
                    description: roleConfig.description,
                    isSystem: roleConfig.isSystem,
                },
            });

            await tx.rolePermission.deleteMany({
                where: { roleId: role.id },
            });

            const permissionRecords = await tx.permission.findMany({
                where: { code: { in: roleConfig.permissions } },
            });

            if (permissionRecords.length === 0) {
                continue;
            }

            await tx.rolePermission.createMany({
                data: permissionRecords.map((permission) => ({
                    roleId: role.id,
                    permissionId: permission.id,
                })),
            });
        }
    }

    private buildTokenResponse(user: AuthenticatedUser): TokenResponse {
        if (!user.role) {
            throw new UnauthorizedException('Пользователь не имеет назначенной роли');
        }

        const permissions = user.role.permissions.map((p) => p.permission.code);
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role.name,
            permissions,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.name,
                permissions,
            },
        };
    }
}
