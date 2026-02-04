"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RequestsService = class RequestsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(filters) {
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
    async findById(id) {
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
            throw new common_1.NotFoundException('Заявка не найдена');
        }
        return request;
    }
    async create(data) {
        return this.prisma.request.create({ data });
    }
    async updateStatus(id, status, assigneeId) {
        await this.findById(id);
        return this.prisma.request.update({
            where: { id },
            data: { status, assigneeId },
        });
    }
    async addComment(requestId, userId, text) {
        await this.findById(requestId);
        return this.prisma.comment.create({
            data: { requestId, userId, text },
            include: { user: { select: { name: true, role: true } } },
        });
    }
    async addAsset(requestId, assetId, notes) {
        await this.findById(requestId);
        return this.prisma.requestItem.create({
            data: { requestId, assetId, notes },
        });
    }
};
exports.RequestsService = RequestsService;
exports.RequestsService = RequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RequestsService);
//# sourceMappingURL=requests.service.js.map