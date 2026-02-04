import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
    constructor(private productsService: ProductsService) { }

    @Get()
    @ApiOperation({ summary: 'Список продуктов' })
    async findAll() {
        return this.productsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить продукт' })
    async findOne(@Param('id') id: string) {
        return this.productsService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Создать продукт' })
    async create(@Body() data: { name: string; sku: string; category: string; description?: string }) {
        return this.productsService.create(data);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Обновить продукт' })
    async update(@Param('id') id: string, @Body() data: { name?: string; category?: string; description?: string }) {
        return this.productsService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Удалить продукт' })
    async delete(@Param('id') id: string) {
        return this.productsService.delete(id);
    }
}
