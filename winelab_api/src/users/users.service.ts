import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    private async resolveRole(roleId?: string | null) {
        if (!roleId) {
            return null;
        }

        return this.prisma.role.findUnique({
            where: { id: roleId },
            select: {
                id: true,
                name: true,
            },
        });
    }

    private buildWarehouseRelation(roleName?: string | null, warehouseId?: string | null) {
        if (roleName !== 'WAREHOUSE') {
            return undefined;
        }

        if (!warehouseId) {
            throw new BadRequestException('Для кладовщика необходимо указать склад');
        }

        return {
            connect: { id: warehouseId },
        };
    }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            }
        });

        if (!user) {
            throw new NotFoundException('Пользователь не найден');
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            }
        });
    }

    async create(createUserDto: CreateUserDto) {
        const existing = await this.findByEmail(createUserDto.email);

        if (existing) {
            throw new ConflictException('Пользователь с таким email уже существует');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        const { roleId, warehouseId, ...userData } = createUserDto;
        const role = await this.resolveRole(roleId);

        const user = await this.prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword,
                role: roleId ? { connect: { id: roleId } } : undefined,
                warehouse: this.buildWarehouseRelation(role?.name, warehouseId),
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                isActive: true,
                createdAt: true,
            },
        });

        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        await this.findById(id);

        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        const { roleId, warehouseId, ...userData } = updateUserDto;
        const currentUser = await this.findById(id);
        const nextRoleId = roleId ?? currentUser.roleId ?? undefined;
        const role = await this.resolveRole(nextRoleId);
        const nextWarehouseId = warehouseId === undefined ? currentUser.warehouseId : warehouseId;

        return this.prisma.user.update({
            where: { id },
            data: {
                ...userData,
                role: roleId ? { connect: { id: roleId } } : undefined,
                warehouse:
                    role?.name === 'WAREHOUSE'
                        ? nextWarehouseId
                            ? { connect: { id: nextWarehouseId } }
                            : (() => {
                                  throw new BadRequestException('Для кладовщика необходимо указать склад');
                              })()
                        : { disconnect: true },
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                isActive: true,
                createdAt: true,
            },
        });
    }

    async delete(id: string) {
        await this.findById(id);

        await this.prisma.user.delete({
            where: { id },
        });

        return { message: 'Пользователь удален' };
    }
}
