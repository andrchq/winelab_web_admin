import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
    @ApiProperty({ example: 'Магазин на Ленина' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'ул. Ленина, 1' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty({ example: 'Москва', required: false })
    @IsString()
    @IsOptional()
    region?: string;
}
