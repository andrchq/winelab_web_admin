import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WarehousesService } from './warehouses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehousesController {
    constructor(private warehousesService: WarehousesService) { }

    @Get()
    @ApiOperation({ summary: 'Список складов' })
    async findAll() {
        return this.warehousesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить информацию о складе' })
    async findOne(@Param('id') id: string) {
        return this.warehousesService.getDetails(id);
    }

    @Post()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Создать склад' })
    async create(@Body() data: { name: string; address?: string }) {
        return this.warehousesService.create(data);
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Обновить склад' })
    async update(@Param('id') id: string, @Body() data: { name?: string; address?: string }) {
        return this.warehousesService.update(id, data);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Удалить склад' })
    async delete(@Param('id') id: string) {
        return this.warehousesService.delete(id);
    }
}
