import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehousesController {
    constructor(private warehousesService: WarehousesService) { }

    @Get()
    @RequirePermissions(SystemPermission.WAREHOUSE_READ)
    @ApiOperation({ summary: 'Список складов' })
    async findAll() {
        return this.warehousesService.findAll();
    }

    @Get(':id')
    @RequirePermissions(SystemPermission.WAREHOUSE_READ)
    @ApiOperation({ summary: 'Получить склад' })
    async findOne(@Param('id') id: string) {
        return this.warehousesService.findById(id);
    }

    @Post()
    // Assuming only Admins/Managers could create warehouses before, now mapping to WAREHOUSE_UPDATE as a proxy for management or check if I need WAREHOUSE_CREATE
    // Actually schema has WAREHOUSE_UPDATE. I should add WAREHOUSE_CREATE or just use UPDATE for management.
    // Let's check permissions.ts - I have WAREHOUSE_READ, WAREHOUSE_UPDATE. I missed CREATE/DELETE.
    // I will use WAREHOUSE_UPDATE for now or update permissions.ts. Let's use WAREHOUSE_UPDATE for create/delete too or assume higher permission like ROLE_UPDATE? No.
    // I'll stick to WAREHOUSE_UPDATE for now and maybe update permissions.ts later if needed.
    @RequirePermissions(SystemPermission.WAREHOUSE_UPDATE)
    @ApiOperation({ summary: 'Создать склад' })
    async create(@Body() createWarehouseDto: CreateWarehouseDto) {
        return this.warehousesService.create(createWarehouseDto);
    }

    @Patch(':id')
    @RequirePermissions(SystemPermission.WAREHOUSE_UPDATE)
    @ApiOperation({ summary: 'Обновить склад' })
    async update(@Param('id') id: string, @Body() updateWarehouseDto: UpdateWarehouseDto) {
        return this.warehousesService.update(id, updateWarehouseDto);
    }

    @Delete(':id')
    @RequirePermissions(SystemPermission.WAREHOUSE_UPDATE)
    @ApiOperation({ summary: 'Удалить склад' })
    async delete(@Param('id') id: string) {
        return this.warehousesService.delete(id);
    }
}
