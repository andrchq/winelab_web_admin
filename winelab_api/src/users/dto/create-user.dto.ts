import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty({ example: 'user@winelab.ru' })
    @IsEmail({}, { message: 'Некорректный email' })
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
    password: string;

    @ApiProperty({ example: 'Иванов Иван' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: '+7 (999) 123-45-67', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ enum: Role, example: Role.SUPPORT })
    @IsEnum(Role)
    @IsOptional()
    role?: Role;
}
