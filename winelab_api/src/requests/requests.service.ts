import { Injectable, NotFoundException } from '@nestjs/common';
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

    async updateStatus(id: string, status: RequestStatus, assigneeId?: string) {
        await this.findById(id);
        return this.prisma.request.update({
            where: { id },
            data: { status, assigneeId },
        });
    }

    async addComment(requestId: string, userId: string, text: string) {
        await this.findById(requestId);
        return this.prisma.comment.create({
            data: { requestId, userId, text },
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
