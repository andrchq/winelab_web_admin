import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

    @ApiProperty({ example: 'uuid-role-id', required: false })
    @IsUUID()
    @IsOptional()
    roleId?: string;
}
