import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { YandexDeliveryService } from './yandex-delivery.service';

@Module({
    controllers: [DeliveriesController],
    providers: [DeliveriesService, YandexDeliveryService],
    exports: [DeliveriesService, YandexDeliveryService],
})
export class DeliveriesModule { }
