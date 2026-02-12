import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.role.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                },
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: string) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        if (!role) {
            throw new NotFoundException('Роль не найдена');
        }

        return role;
    }

    async create(createRoleDto: CreateRoleDto) {
        const existing = await this.prisma.role.findUnique({
            where: { name: createRoleDto.name }
        });

        if (existing) {
            throw new ConflictException('Роль с таким именем уже существует');
        }

        const { permissionIds, ...roleData } = createRoleDto;

        return this.prisma.role.create({
            data: {
                ...roleData,
                permissions: {
                    create: permissionIds?.map((pid: string) => ({
                        permission: { connect: { id: pid } }
                    }))
                }

            },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }

    async update(id: string, updateRoleDto: UpdateRoleDto) {
        const role = await this.findOne(id);

        if (role.isSystem && updateRoleDto.name && updateRoleDto.name !== role.name) {
            throw new ConflictException('Нельзя менять имя системной роли');
        }

        const { permissionIds, ...roleData } = updateRoleDto;

        // If permissions are updated, we need to delete old ones and create new ones
        // or usage smart update. For simplicity: delete all and re-create if permissionIds provided

        let permissionsUpdate = {};
        if (permissionIds) {
            permissionsUpdate = {
                permissions: {
                    deleteMany: {},
                    create: permissionIds.map((pid: string) => ({
                        permission: { connect: { id: pid } }
                    }))
                }
            };
        }

        return this.prisma.role.update({
            where: { id },
            data: {
                ...roleData,
                ...permissionsUpdate
            },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }

    async remove(id: string) {

        const role = await this.findOne(id);

        if (role.isSystem) {
            throw new ConflictException('Нельзя удалить системную роль');
        }

        const usersCount = await this.prisma.user.count({ where: { roleId: id } });
        if (usersCount > 0) {
            throw new ConflictException('Нельзя удалить роль, к которой привязаны пользователи');
        }

        return this.prisma.role.delete({ where: { id } });
    }
}
