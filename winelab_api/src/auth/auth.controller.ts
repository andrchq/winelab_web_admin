import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Вход в систему' })
    @ApiResponse({ status: 200, description: 'Успешный вход' })
    @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Обновление access token' })
    @ApiResponse({ status: 200, description: 'Токен обновлен' })
    @ApiResponse({ status: 401, description: 'Недействительный refresh token' })
    async refresh(@Body() refreshDto: RefreshTokenDto) {
        return this.authService.refresh(refreshDto.refreshToken);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Получить текущего пользователя' })
    @ApiResponse({ status: 200, description: 'Данные пользователя' })
    @ApiResponse({ status: 401, description: 'Не авторизован' })
    async me(@CurrentUser() user: User) {
        const { password, ...result } = user;
        return result;
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Выход из системы' })
    async logout() {
        return { message: 'Logged out' };
    }
}

