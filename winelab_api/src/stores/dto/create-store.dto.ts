import { StoreStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateStoreDto {
    @ApiProperty({ example: 'Магазин на Ленина' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'ул. Ленина, 1' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiPropertyOptional({ example: 'OPEN', enum: StoreStatus })
    @IsEnum(StoreStatus)
    @IsOptional()
    status?: StoreStatus;

    @ApiPropertyOptional({ example: 'Москва' })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional({ example: 'Москва' })
    @IsString()
    @IsOptional()
    region?: string;

    @ApiPropertyOptional({ example: 'ЦФО-001' })
    @IsString()
    @IsOptional()
    cfo?: string;

    @ApiPropertyOptional({ example: '+79990000000' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ example: 'store@example.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({ example: 'Иванов И.И.' })
    @IsString()
    @IsOptional()
    manager?: string;

    @ApiPropertyOptional({ example: '10.0.0.1' })
    @IsString()
    @IsOptional()
    serverIp?: string;

    @ApiPropertyOptional({ example: '192.168.0.1' })
    @IsString()
    @IsOptional()
    providerIp1?: string;

    @ApiPropertyOptional({ example: '192.168.0.2' })
    @IsString()
    @IsOptional()
    providerIp2?: string;

    @ApiPropertyOptional({ example: 'http://10.0.0.1:8080' })
    @IsString()
    @IsOptional()
    utmUrl?: string;

    @ApiPropertyOptional({ example: 'http://10.0.0.1:8090' })
    @IsString()
    @IsOptional()
    retailUrl?: string;

    @ApiPropertyOptional({ example: 'ООО Винлаб' })
    @IsString()
    @IsOptional()
    legalEntity?: string;

    @ApiPropertyOptional({ example: '7700000000' })
    @IsString()
    @IsOptional()
    inn?: string;

    @ApiPropertyOptional({ example: '770001001' })
    @IsString()
    @IsOptional()
    kpp?: string;

    @ApiPropertyOptional({ example: '123456789012345' })
    @IsString()
    @IsOptional()
    fsrarId?: string;

    @ApiPropertyOptional({ example: 'TRASSIR' })
    @IsString()
    @IsOptional()
    cctvSystem?: string;

    @ApiPropertyOptional({ example: 12 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    cameraCount?: number;
}
