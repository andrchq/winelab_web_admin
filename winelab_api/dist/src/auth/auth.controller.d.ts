import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<import("./auth.service").TokenResponse>;
    refresh(refreshDto: RefreshTokenDto): Promise<{
        accessToken: string;
    }>;
    me(user: User): Promise<{
        id: string;
        email: string;
        name: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    logout(): Promise<{
        message: string;
    }>;
}
