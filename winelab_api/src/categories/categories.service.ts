
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryType } from '@prisma/client';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    private deriveCategoryType(data: { categoryType?: CategoryType; isMandatory?: boolean }) {
        if (data.categoryType) {
            return data.categoryType;
        }

        return data.isMandatory ? CategoryType.REQUIRED : CategoryType.OPTIONAL;
    }

    private validateParentType(parentType: CategoryType, childType: CategoryType) {
        if (parentType !== childType) {
            throw new BadRequestException('Parent category must have the same type');
        }
    }

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

    async create(data: { name: string; code: string; isMandatory?: boolean; categoryType?: CategoryType; parentId?: string }) {
        // Check code uniqueness
        const existing = await this.prisma.equipmentCategory.findUnique({
            where: { code: data.code }
        });

        if (existing) {
            throw new BadRequestException('Category with this code already exists');
        }

        const categoryType = this.deriveCategoryType(data);

        if (data.parentId) {
            const parent = await this.prisma.equipmentCategory.findUnique({
                where: { id: data.parentId },
                select: { id: true, categoryType: true },
            });

            if (!parent) {
                throw new BadRequestException('Parent category not found');
            }

            this.validateParentType(parent.categoryType, categoryType);
        }

        return this.prisma.equipmentCategory.create({
            data: {
                name: data.name,
                code: data.code,
                categoryType,
                isMandatory: categoryType === CategoryType.REQUIRED,
                parentId: data.parentId
            }
        });
    }

    async update(id: string, data: { name?: string; isMandatory?: boolean; categoryType?: CategoryType; parentId?: string | null }) {
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

        const currentCategory = await this.prisma.equipmentCategory.findUnique({
            where: { id },
            select: { id: true, categoryType: true, parentId: true },
        });

        if (!currentCategory) {
            throw new BadRequestException('Category not found');
        }

        const categoryType = this.deriveCategoryType({
            categoryType: data.categoryType,
            isMandatory: data.isMandatory ?? (currentCategory.categoryType === CategoryType.REQUIRED),
        });

        const nextParentId = data.parentId === undefined ? currentCategory.parentId : data.parentId;

        if (nextParentId) {
            const parent = await this.prisma.equipmentCategory.findUnique({
                where: { id: nextParentId },
                select: { id: true, categoryType: true },
            });

            if (!parent) {
                throw new BadRequestException('Parent category not found');
            }

            this.validateParentType(parent.categoryType, categoryType);
        }

        return this.prisma.equipmentCategory.update({
            where: { id },
            data: {
                ...data,
                categoryType,
                isMandatory: categoryType === CategoryType.REQUIRED,
            }
        });
    }

    async remove(id: string) {
        const category = await this.prisma.equipmentCategory.findUnique({
            where: { id },
            include: {
                _count: { select: { products: true, children: true } },
            }
        });

        if (!category) {
            throw new BadRequestException('Category not found');
        }

        // Re-parent child categories to this category's parent (or null)
        if (category._count.children > 0) {
            await this.prisma.equipmentCategory.updateMany({
                where: { parentId: id },
                data: { parentId: category.parentId ?? null }
            });
        }

        // Use raw SQL to null-out categoryId to bypass FK restriction
        await this.prisma.$executeRaw`UPDATE products SET "categoryId" = NULL WHERE "categoryId" = ${id}`;

        return this.prisma.equipmentCategory.delete({
            where: { id }
        });
    }
}
