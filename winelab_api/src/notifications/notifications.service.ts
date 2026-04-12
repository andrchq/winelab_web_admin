import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationScope, NotificationType, Prisma } from '@prisma/client';

import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';

type RoleName = 'ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'USER' | 'SUPPORT';

interface CreateNotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  meta?: Prisma.InputJsonValue;
  userId?: string;
  roleNames?: RoleName[];
  warehouseId?: string;
}

interface NotificationAudience {
  scope: NotificationScope;
  roles: string[];
  userId: string | null;
  warehouseId: string | null;
}

interface NotificationWithAudience {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  scope: NotificationScope;
  link: string | null;
  meta: unknown;
  createdAt: Date;
  userId: string | null;
  warehouseId: string | null;
  reads: { readAt: Date }[];
  roleTargets: { role: { name: string } }[];
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private async getUserAudience(userId: string): Promise<{ roleId: string | null; roleName: string | null; warehouseId: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roleId: true,
        warehouseId: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      roleId: user.roleId,
      roleName: user.role?.name ?? null,
      warehouseId: user.warehouseId,
    };
  }

  private async resolveAudience(userId: string) {
    const audience = await this.getUserAudience(userId);
    const roleCondition =
      audience.roleName === 'ADMIN'
        ? { roleTargets: { some: {} } }
        : audience.roleId
          ? audience.roleName === 'WAREHOUSE'
            ? {
                roleTargets: { some: { roleId: audience.roleId } },
                OR: [
                  { warehouseId: null },
                  ...(audience.warehouseId ? [{ warehouseId: audience.warehouseId }] : []),
                ],
              }
            : { roleTargets: { some: { roleId: audience.roleId } } }
          : null;

    const visibleWhere = {
      OR: [
        { scope: NotificationScope.GLOBAL },
        { scope: NotificationScope.USER, userId },
        ...(roleCondition
          ? [
              {
                scope: NotificationScope.ROLE,
                ...roleCondition,
              },
            ]
          : []),
      ],
    };

    return {
      ...audience,
      visibleWhere,
    };
  }

  private mapAudience(notification: {
    scope: NotificationScope;
    userId: string | null;
    warehouseId: string | null;
    roleTargets: { role: { name: string } }[];
  }): NotificationAudience {
    return {
      scope: notification.scope,
      roles: notification.roleTargets.map((target) => target.role.name),
      userId: notification.userId,
      warehouseId: notification.warehouseId,
    };
  }

  private mapNotificationForUser(
    notification: NotificationWithAudience,
  ) {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: notification.link,
      meta: notification.meta,
      createdAt: notification.createdAt,
      isRead: notification.reads.length > 0,
      audience: this.mapAudience(notification),
    };
  }

  private emitNotificationCreated(payload: ReturnType<NotificationsService['mapNotificationForUser']>) {
    const audience = payload.audience;

    if (audience.scope === NotificationScope.GLOBAL) {
      this.eventsGateway.server.emit('notification:new', payload);
      return;
    }

    if (audience.scope === NotificationScope.USER && audience.userId) {
      this.eventsGateway.server.to(`user:${audience.userId}`).emit('notification:new', payload);
      return;
    }

    const targetRoles = new Set(audience.roles);
    if (audience.scope === NotificationScope.ROLE && !targetRoles.has('ADMIN')) {
      targetRoles.add('ADMIN');
    }

    targetRoles.forEach((roleName) => {
      if (roleName === 'WAREHOUSE' && audience.warehouseId) {
        this.eventsGateway.server.to(`warehouse:${audience.warehouseId}:role:WAREHOUSE`).emit('notification:new', payload);
        return;
      }

      this.eventsGateway.server.to(`role:${roleName}`).emit('notification:new', payload);
    });
  }

  private emitNotificationRead(userId: string, notificationIds: string[]) {
    this.eventsGateway.server.to(`user:${userId}`).emit('notification:read', {
      userId,
      notificationIds,
    });
  }

  private async loadNotificationForBroadcast(notificationId: string): Promise<NotificationWithAudience> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        roleTargets: {
          include: {
            role: { select: { name: true } },
          },
        },
        reads: {
          where: { userId: '__none__' },
          select: { readAt: true },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }

    return notification;
  }

  async getForUser(userId: string) {
    const { visibleWhere } = await this.resolveAudience(userId);

    const notifications = await this.prisma.notification.findMany({
      where: visibleWhere,
      include: {
        roleTargets: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        reads: {
          where: { userId },
          select: { readAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const mapped = notifications.map((notification: NotificationWithAudience) => this.mapNotificationForUser(notification));
    const unreadItems = mapped.filter((item) => !item.isRead);

    return {
      items: mapped,
      unreadCount: unreadItems.length,
      stats: {
        total: mapped.length,
        unread: unreadItems.length,
        personalUnread: unreadItems.filter((item: ReturnType<NotificationsService['mapNotificationForUser']>) => item.audience.scope === NotificationScope.USER).length,
        roleUnread: unreadItems.filter((item: ReturnType<NotificationsService['mapNotificationForUser']>) => item.audience.scope === NotificationScope.ROLE).length,
        globalUnread: unreadItems.filter((item: ReturnType<NotificationsService['mapNotificationForUser']>) => item.audience.scope === NotificationScope.GLOBAL).length,
      },
    };
  }

  async markRead(userId: string, notificationId: string) {
    const { visibleWhere } = await this.resolveAudience(userId);

    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        ...visibleWhere,
      },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }

    await this.prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        notificationId,
        userId,
      },
    });

    this.emitNotificationRead(userId, [notificationId]);

    return { success: true, notificationId };
  }

  async markAllRead(userId: string) {
    const { visibleWhere } = await this.resolveAudience(userId);

    const unread = await this.prisma.notification.findMany({
      where: {
        ...visibleWhere,
        reads: {
          none: { userId },
        },
      },
      select: { id: true },
    });

    if (unread.length === 0) {
      return { success: true, count: 0 };
    }

    await this.prisma.notificationRead.createMany({
      data: unread.map((notification: { id: string }) => ({
        notificationId: notification.id,
        userId,
      })),
      skipDuplicates: true,
    });

    const notificationIds = unread.map((notification: { id: string }) => notification.id);
    this.emitNotificationRead(userId, notificationIds);

    return {
      success: true,
      count: notificationIds.length,
    };
  }

  async createGlobal(input: Omit<CreateNotificationInput, 'roleNames' | 'userId'>) {
    const created = await this.prisma.notification.create({
      data: {
        title: input.title,
        message: input.message,
        type: input.type ?? NotificationType.SYSTEM,
        scope: NotificationScope.GLOBAL,
        link: input.link,
        meta: input.meta,
        warehouseId: input.warehouseId,
      },
      select: { id: true },
    });

    const notification = await this.loadNotificationForBroadcast(created.id);
    await this.emitNotificationCreated(this.mapNotificationForUser(notification));
    return notification;
  }

  async createForRoles(input: Omit<CreateNotificationInput, 'userId'> & { roleNames: RoleName[] }) {
    if (!input.roleNames.length) {
      throw new BadRequestException('Для role-уведомления нужно передать хотя бы одну роль');
    }

    const roles = await this.prisma.role.findMany({
      where: { name: { in: input.roleNames } },
      select: { id: true, name: true },
    });

    if (!roles.length) {
      throw new NotFoundException('Не найдены роли для уведомления');
    }

    const created = await this.prisma.notification.create({
      data: {
        title: input.title,
        message: input.message,
        type: input.type ?? NotificationType.SYSTEM,
        scope: NotificationScope.ROLE,
        link: input.link,
        meta: input.meta,
        warehouseId: input.warehouseId,
        roleTargets: {
          create: roles.map((role) => ({
            roleId: role.id,
          })),
        },
      },
      select: { id: true },
    });

    const notification = await this.loadNotificationForBroadcast(created.id);
    await this.emitNotificationCreated(this.mapNotificationForUser(notification));
    return notification;
  }

  async createForUser(input: Omit<CreateNotificationInput, 'roleNames'> & { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь для уведомления не найден');
    }

    const created = await this.prisma.notification.create({
      data: {
        title: input.title,
        message: input.message,
        type: input.type ?? NotificationType.SYSTEM,
        scope: NotificationScope.USER,
        link: input.link,
        meta: input.meta,
        userId: input.userId,
        warehouseId: input.warehouseId,
      },
      select: { id: true },
    });

    const notification = await this.loadNotificationForBroadcast(created.id);
    await this.emitNotificationCreated(this.mapNotificationForUser(notification));
    return notification;
  }
}
