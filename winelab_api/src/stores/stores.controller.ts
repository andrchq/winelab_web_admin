import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Stores')
@ApiBearerAuth()
@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
    constructor(private storesService: StoresService) { }

    @Post('import')
    @Roles(Role.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({ summary: 'Импорт магазинов из CSV' })
    async import(@UploadedFile() file: any) {
        return this.storesService.importStores(file);
    }

    @Get()
    @ApiOperation({ summary: 'Список магазинов' })
    async findAll() {
        return this.storesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить магазин' })
    async findOne(@Param('id') id: string) {
        return this.storesService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Создать магазин' })
    async create(@Body() data: { name: string; address: string; region?: string }, @Request() req: any) {
        return this.storesService.create(data, req.user?.id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Обновить магазин' })
    async update(@Param('id') id: string, @Body() data: { name?: string; address?: string }) {
        return this.storesService.update(id, data);
    }

    @Get(':id/ping')
    @ApiOperation({ summary: 'Проверить доступность оборудования' })
    async ping(@Param('id') id: string) {
        return this.storesService.pingStoreIps(id);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Удалить магазин' })
    async delete(@Param('id') id: string) {
        return this.storesService.delete(id);
    }

    @Post(':id/equipment')
    @Roles(Role.ADMIN, Role.MANAGER)
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
