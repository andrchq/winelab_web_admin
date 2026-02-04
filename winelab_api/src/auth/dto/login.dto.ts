import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'admin@winelab.ru' })
    @IsEmail({}, { message: 'Некорректный email' })
    @IsNotEmpty({ message: 'Email обязателен' })
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty({ message: 'Пароль обязателен' })
    @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
    password: string;
}
