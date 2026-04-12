import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { YandexDeliveryService } from './yandex-delivery.service';

@Module({
    imports: [NotificationsModule],
    controllers: [DeliveriesController],
    providers: [DeliveriesService, YandexDeliveryService],
    exports: [DeliveriesService, YandexDeliveryService],
})
export class DeliveriesModule { }
