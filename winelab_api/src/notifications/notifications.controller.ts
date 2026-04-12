import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить уведомления текущего пользователя' })
  async findMine(@CurrentUser() user: User): Promise<unknown> {
    return this.notificationsService.getForUser(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Отметить уведомление как прочитанное' })
  async markRead(@Param('id') id: string, @CurrentUser() user: User): Promise<unknown> {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Отметить все уведомления как прочитанные' })
  async markAllRead(@CurrentUser() user: User): Promise<unknown> {
    return this.notificationsService.markAllRead(user.id);
  }
}
