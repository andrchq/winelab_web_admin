import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestStatus, RequestPriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestsService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters?: { status?: RequestStatus; priority?: RequestPriority }) {
        return this.prisma.request.findMany({
            where: filters,
            include: {
                store: { select: { name: true } },
                creator: { select: { name: true } },
                assignee: { select: { name: true } },
                _count: { select: { comments: true, items: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const request = await this.prisma.request.findUnique({
            where: { id },
            include: {
                store: true,
                creator: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } },
                items: { include: { asset: { include: { product: true } } } },
                comments: {
                    include: { user: { select: { name: true, role: true } } },
                    orderBy: { createdAt: 'asc' },
                },
                shipments: true,
            },
        });

        if (!request) {
            throw new NotFoundException('Заявка не найдена');
        }

        return request;
    }

    async create(data: {
        title: string;
        description?: string;
        storeId: string;
        creatorId: string;
        priority?: RequestPriority;
    }) {
        return this.prisma.request.create({ data });
    }

    async updateStatus(id: string, status: RequestStatus, actorId: string, assigneeId?: string) {
        const request = await this.findById(id);

        if (request.status === status) {
            return request;
        }

        if (request.status === RequestStatus.COMPLETED || request.status === RequestStatus.CANCELLED) {
            throw new BadRequestException('Статус этой заявки уже нельзя изменить');
        }

        const nextAssigneeId = assigneeId ?? request.assigneeId ?? actorId;
        const statusLabels: Record<RequestStatus, string> = {
            NEW: 'Новая',
            IN_PROGRESS: 'В работе',
            READY: 'Готова',
            SHIPPED: 'Отгружена',
            COMPLETED: 'Завершена',
            CANCELLED: 'Отменена',
        };

        return this.prisma.$transaction(async (tx) => {
            const updatedRequest = await tx.request.update({
                where: { id },
                data: { status, assigneeId: nextAssigneeId },
                include: {
                    store: true,
                    creator: { select: { id: true, name: true, email: true } },
                    assignee: { select: { id: true, name: true, email: true } },
                    items: { include: { asset: { include: { product: true } } } },
                    comments: {
                        include: { user: { select: { name: true, role: true } } },
                        orderBy: { createdAt: 'asc' },
                    },
                    shipments: true,
                },
            });

            await tx.comment.create({
                data: {
                    requestId: id,
                    userId: actorId,
                    text: `Статус изменен: ${statusLabels[request.status]} -> ${statusLabels[status]}`,
                },
            });

            return updatedRequest;
        });
    }

    async addComment(requestId: string, userId: string, text: string) {
        await this.findById(requestId);
        const normalizedText = text.trim();

        if (!normalizedText) {
            throw new BadRequestException('Комментарий не может быть пустым');
        }

        return this.prisma.comment.create({
            data: { requestId, userId, text: normalizedText },
            include: { user: { select: { name: true, role: true } } },
        });
    }

    async addAsset(requestId: string, assetId: string, notes?: string) {
        await this.findById(requestId);
        return this.prisma.requestItem.create({
            data: { requestId, assetId, notes },
        });
    }
}
