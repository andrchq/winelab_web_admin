import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWarehouseDto {
    @ApiProperty({ example: 'Main warehouse' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Moscow, Warehouse st. 5', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: 'Ivan Petrov', required: false })
    @IsString()
    @IsOptional()
    contactName?: string;

    @ApiProperty({ example: '+7 999 000-00-00', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ example: 'warehouse@company.local', required: false })
    @IsString()
    @IsOptional()
    email?: string;
}
