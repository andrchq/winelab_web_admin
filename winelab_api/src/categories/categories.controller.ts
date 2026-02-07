
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    findAll() {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
    }

    @Post()
    @Roles('ADMIN', 'MANAGER')
    create(@Body() body: { name: string; code: string; isMandatory?: boolean; parentId?: string }) {
        return this.categoriesService.create(body);
    }

    @Patch(':id')
    @Roles('ADMIN', 'MANAGER')
    update(
        @Param('id') id: string,
        @Body() body: { name?: string; isMandatory?: boolean; parentId?: string | null }
    ) {
        return this.categoriesService.update(id, body);
    }

    @Delete(':id')
    @Roles('ADMIN', 'MANAGER')
    remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }
}
