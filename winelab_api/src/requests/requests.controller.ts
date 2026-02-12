import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequestStatus, RequestPriority, User } from '@prisma/client';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RequestsController {
    constructor(private requestsService: RequestsService) { }

    @Get()
    @RequirePermissions(SystemPermission.REQUEST_READ)
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
    @RequirePermissions(SystemPermission.REQUEST_READ)
    @ApiOperation({ summary: 'Получить заявку' })
    async findOne(@Param('id') id: string) {
        return this.requestsService.findById(id);
    }

    @Post()
    @RequirePermissions(SystemPermission.REQUEST_CREATE)
    @ApiOperation({ summary: 'Создать заявку' })
    async create(
        @Body() data: { title: string; description?: string; storeId: string; priority?: RequestPriority },
        @CurrentUser() user: User,
    ) {
        return this.requestsService.create({ ...data, creatorId: user.id });
    }

    @Patch(':id/status')
    @RequirePermissions(SystemPermission.REQUEST_UPDATE)
    @ApiOperation({ summary: 'Обновить статус' })
    async updateStatus(
        @Param('id') id: string,
        @Body() data: { status: RequestStatus; assigneeId?: string },
    ) {
        return this.requestsService.updateStatus(id, data.status, data.assigneeId);
    }

    @Post(':id/comments')
    @RequirePermissions(SystemPermission.REQUEST_READ) // Assumes anyone who can read can comment
    @ApiOperation({ summary: 'Добавить комментарий' })
    async addComment(
        @Param('id') id: string,
        @Body() data: { text: string },
        @CurrentUser() user: User,
    ) {
        return this.requestsService.addComment(id, user.id, data.text);
    }

    @Post(':id/assets')
    @RequirePermissions(SystemPermission.REQUEST_UPDATE)
    @ApiOperation({ summary: 'Добавить оборудование к заявке' })
    async addAsset(
        @Param('id') id: string,
        @Body() data: { assetId: string; notes?: string },
    ) {
        return this.requestsService.addAsset(id, data.assetId, data.notes);
    }
}
