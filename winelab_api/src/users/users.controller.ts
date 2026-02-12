import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @RequirePermissions(SystemPermission.USER_READ)
    @ApiOperation({ summary: 'Список пользователей' })
    async findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @RequirePermissions(SystemPermission.USER_READ)
    @ApiOperation({ summary: 'Получить пользователя' })
    async findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Post()
    @RequirePermissions(SystemPermission.USER_CREATE)
    @ApiOperation({ summary: 'Создать пользователя' })
    async create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Patch(':id')
    @RequirePermissions(SystemPermission.USER_UPDATE)
    @ApiOperation({ summary: 'Обновить пользователя' })
    async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @RequirePermissions(SystemPermission.USER_DELETE)
    @ApiOperation({ summary: 'Удалить пользователя' })
    async delete(@Param('id') id: string) {
        return this.usersService.delete(id);
    }
}
