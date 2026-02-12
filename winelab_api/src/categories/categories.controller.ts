
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';

@Controller('categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @RequirePermissions(SystemPermission.CATEGORY_READ)
    findAll() {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    @RequirePermissions(SystemPermission.CATEGORY_READ)
    findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
    }

    @Post()
    @RequirePermissions(SystemPermission.CATEGORY_MANAGE)
    create(@Body() body: { name: string; code: string; isMandatory?: boolean; parentId?: string }) {
        return this.categoriesService.create(body);
    }

    @Patch(':id')
    @RequirePermissions(SystemPermission.CATEGORY_MANAGE)
    update(
        @Param('id') id: string,
        @Body() body: { name?: string; isMandatory?: boolean; parentId?: string | null }
    ) {
        return this.categoriesService.update(id, body);
    }

    @Delete(':id')
    @RequirePermissions(SystemPermission.CATEGORY_MANAGE)
    remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }
}
