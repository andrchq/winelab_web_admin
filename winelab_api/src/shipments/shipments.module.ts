import { Module } from '@nestjs/common';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';

@Module({
    imports: [DeliveriesModule, NotificationsModule],
    controllers: [ShipmentsController],
    providers: [ShipmentsService],
    exports: [ShipmentsService],
})
export class ShipmentsModule { }
