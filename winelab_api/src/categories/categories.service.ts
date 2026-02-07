
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentCategory } from '@prisma/client';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.equipmentCategory.findMany({
            include: {
                parent: true,
                _count: {
                    select: { products: true, children: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.equipmentCategory.findUnique({
            where: { id },
            include: {
                parent: true,
                children: true
            }
        });
    }

    async create(data: { name: string; code: string; isMandatory?: boolean; parentId?: string }) {
        // Check code uniqueness
        const existing = await this.prisma.equipmentCategory.findUnique({
            where: { code: data.code }
        });

        if (existing) {
            throw new BadRequestException('Category with this code already exists');
        }

        return this.prisma.equipmentCategory.create({
            data: {
                name: data.name,
                code: data.code,
                isMandatory: data.isMandatory ?? false,
                parentId: data.parentId
            }
        });
    }

    async update(id: string, data: { name?: string; isMandatory?: boolean; parentId?: string | null }) {
        // Prevent circular dependency if parentId is updated
        if (data.parentId) {
            if (data.parentId === id) {
                throw new BadRequestException('Cannot set category as its own parent');
            }
            // Simple check: ensure parent is not a child of this category (one level deep check for now, recursive is better but let's start simple)
            const child = await this.prisma.equipmentCategory.findFirst({
                where: { parentId: id, id: data.parentId }
            });
            if (child) {
                throw new BadRequestException('Cannot set a child category as parent');
            }
        }

        return this.prisma.equipmentCategory.update({
            where: { id },
            data
        });
    }

    async remove(id: string) {
        // Check for dependencies
        const category = await this.prisma.equipmentCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true, children: true }
                }
            }
        });

        if (!category) {
            throw new BadRequestException('Category not found');
        }

        if (category._count.products > 0) {
            throw new BadRequestException('Cannot delete category with associated products');
        }

        if (category._count.children > 0) {
            throw new BadRequestException('Cannot delete category with child categories');
        }

        return this.prisma.equipmentCategory.delete({
            where: { id }
        });
    }
}
