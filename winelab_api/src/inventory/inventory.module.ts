import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InitialInventoryController } from './initial-inventory.controller';
import { InitialInventoryService } from './initial-inventory.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [InventoryController, InitialInventoryController],
    providers: [InventoryService, InitialInventoryService],
    exports: [InventoryService, InitialInventoryService],
})
export class InventoryModule { }
