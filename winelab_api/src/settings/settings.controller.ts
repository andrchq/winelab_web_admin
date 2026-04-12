import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('store-auto-install-equipment')
  @RequirePermissions(SystemPermission.STORE_UPDATE)
  @ApiOperation({ summary: 'Получить перечень оборудования автоустановки' })
  async getStoreAutoInstallEquipment() {
    return this.settingsService.getStoreAutoInstallProducts();
  }

  @Patch('store-auto-install-equipment')
  @RequirePermissions(SystemPermission.STORE_UPDATE)
  @ApiOperation({ summary: 'Сохранить перечень оборудования автоустановки' })
  async updateStoreAutoInstallEquipment(@Body() body: { productIds: string[] }) {
    return this.settingsService.updateStoreAutoInstallProducts(body.productIds || []);
  }
}
