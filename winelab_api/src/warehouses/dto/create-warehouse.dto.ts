import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWarehouseDto {
    @ApiProperty({ example: 'Основной склад' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'ул. Складская, 5', required: false })
    @IsString()
    @IsOptional()
    address?: string;
}
