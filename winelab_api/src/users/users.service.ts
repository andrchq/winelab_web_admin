import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

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
                }
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
                }
            }
        });
    }

    async create(createUserDto: CreateUserDto) {
        const existing = await this.findByEmail(createUserDto.email);

        if (existing) {
            throw new ConflictException('Пользователь с таким email уже существует');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        // Extract roleId if present, otherwise ignore (or set default if we had logic for it)
        const { roleId, ...userData } = createUserDto;

        const user = await this.prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword,
                role: roleId ? { connect: { id: roleId } } : undefined,
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

        const { roleId, ...userData } = updateUserDto;

        return this.prisma.user.update({
            where: { id },
            data: {
                ...userData,
                role: roleId ? { connect: { id: roleId } } : undefined,
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
