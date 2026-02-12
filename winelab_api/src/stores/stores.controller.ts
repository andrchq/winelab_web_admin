import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';

@ApiTags('Stores')
@ApiBearerAuth()
@Controller('stores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoresController {
    constructor(private storesService: StoresService) { }

    @Get()
    @RequirePermissions(SystemPermission.STORE_READ)
    @ApiOperation({ summary: 'Список магазинов' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'CLOSED', 'RECONSTRUCTION', 'TECHNICAL_ISSUES'] })
    @ApiQuery({ name: 'manager', required: false })
    async findAll(
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('manager') manager?: string,
    ) {
        return this.storesService.findAll({ search, status, manager });
    }

    @Get(':id')
    @RequirePermissions(SystemPermission.STORE_READ)
    @ApiOperation({ summary: 'Получить магазин' })
    async findOne(@Param('id') id: string) {
        return this.storesService.findById(id);
    }

    @Get(':id/ping')
    @RequirePermissions(SystemPermission.STORE_READ)
    @ApiOperation({ summary: 'Пинг IP адресов магазина' })
    async ping(@Param('id') id: string) {
        return this.storesService.pingStoreIps(id);
    }


    @Post()
    @RequirePermissions(SystemPermission.STORE_CREATE)
    @ApiOperation({ summary: 'Создать магазин' })
    async create(@Body() createStoreDto: CreateStoreDto) {
        return this.storesService.create(createStoreDto);
    }

    @Patch(':id')
    @RequirePermissions(SystemPermission.STORE_UPDATE)
    @ApiOperation({ summary: 'Обновить магазин' })
    async update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
        return this.storesService.update(id, updateStoreDto);
    }

    @Delete(':id')
    @RequirePermissions(SystemPermission.STORE_DELETE)
    @ApiOperation({ summary: 'Удалить магазин' })
    async delete(@Param('id') id: string) {
        return this.storesService.delete(id);
    }

    @Post(':id/equipment')
    @RequirePermissions(SystemPermission.STORE_UPDATE)
    @ApiOperation({ summary: 'Добавить оборудование в магазин' })
    async addEquipment(
        @Param('id') id: string,
        @Body() data: {
            equipment: Array<{ category: string; stockItemId: string; comment: string }>;
            skipInventory: boolean;
            warehouseId: string;
        }
    ) {
        return this.storesService.addEquipment(id, data);
    }
}
