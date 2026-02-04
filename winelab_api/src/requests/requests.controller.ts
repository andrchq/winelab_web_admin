import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role, RequestStatus, RequestPriority, User } from '@prisma/client';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
    constructor(private requestsService: RequestsService) { }

    @Get()
    @ApiOperation({ summary: 'Список заявок' })
    @ApiQuery({ name: 'status', required: false, enum: RequestStatus })
    @ApiQuery({ name: 'priority', required: false, enum: RequestPriority })
    async findAll(
        @Query('status') status?: RequestStatus,
        @Query('priority') priority?: RequestPriority,
    ) {
        return this.requestsService.findAll({ status, priority });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить заявку' })
    async findOne(@Param('id') id: string) {
        return this.requestsService.findById(id);
    }

    @Post()
    @ApiOperation({ summary: 'Создать заявку' })
    async create(
        @Body() data: { title: string; description?: string; storeId: string; priority?: RequestPriority },
        @CurrentUser() user: User,
    ) {
        return this.requestsService.create({ ...data, creatorId: user.id });
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Обновить статус' })
    async updateStatus(
        @Param('id') id: string,
        @Body() data: { status: RequestStatus; assigneeId?: string },
    ) {
        return this.requestsService.updateStatus(id, data.status, data.assigneeId);
    }

    @Post(':id/comments')
    @ApiOperation({ summary: 'Добавить комментарий' })
    async addComment(
        @Param('id') id: string,
        @Body() data: { text: string },
        @CurrentUser() user: User,
    ) {
        return this.requestsService.addComment(id, user.id, data.text);
    }

    @Post(':id/assets')
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Добавить оборудование к заявке' })
    async addAsset(
        @Param('id') id: string,
        @Body() data: { assetId: string; notes?: string },
    ) {
        return this.requestsService.addAsset(id, data.assetId, data.notes);
    }
}
