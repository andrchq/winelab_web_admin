import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
    constructor(private productsService: ProductsService) { }

    @Get()
    @RequirePermissions(SystemPermission.PRODUCT_READ)
    @ApiOperation({ summary: 'Список продуктов' })
    async findAll(@Query('category') category?: string) {
        return this.productsService.findAll(category);
    }

    @Get(':id')
    @RequirePermissions(SystemPermission.PRODUCT_READ)
    @ApiOperation({ summary: 'Получить продукт' })
    async findOne(@Param('id') id: string) {
        return this.productsService.findById(id);
    }

    @Post()
    @RequirePermissions(SystemPermission.PRODUCT_CREATE)
    @ApiOperation({ summary: 'Создать продукт' })
    async create(@Body() data: { name: string; sku: string; category: string; description?: string }) {
        return this.productsService.create(data);
    }

    @Patch(':id')
    @RequirePermissions(SystemPermission.PRODUCT_UPDATE)
    @ApiOperation({ summary: 'Обновить продукт' })
    async update(@Param('id') id: string, @Body() data: { name?: string; category?: string; description?: string }) {
        return this.productsService.update(id, data);
    }

    @Delete(':id')
    @RequirePermissions(SystemPermission.PRODUCT_DELETE)
    @ApiOperation({ summary: 'Удалить продукт' })
    async delete(@Param('id') id: string) {
        return this.productsService.delete(id);
    }
}
