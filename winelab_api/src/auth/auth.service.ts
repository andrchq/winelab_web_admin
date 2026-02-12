import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

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

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

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

        const permissions = user.role.permissions.map(p => p.permission.code);

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role.name,
            permissions: permissions,
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
                permissions: permissions,
            },
        };
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

            const permissions = user.role.permissions.map(p => p.permission.code);

            const newPayload: JwtPayload = {
                sub: user.id,
                email: user.email,
                role: user.role.name,
                permissions: permissions,
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

        // Flatten permissions for easier access in Guards
        const permissions = user.role?.permissions.map(p => p.permission.code) || [];

        return {
            ...user,
            role: user.role?.name,
            permissions,
        };
    }
}
