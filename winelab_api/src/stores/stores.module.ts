import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [SettingsModule],
    controllers: [StoresController],
    providers: [StoresService],
    exports: [StoresService],
})
export class StoresModule { }
