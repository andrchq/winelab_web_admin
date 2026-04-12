import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';

@Module({
    imports: [NotificationsModule],
    controllers: [RequestsController],
    providers: [RequestsService],
    exports: [RequestsService],
})
export class RequestsModule { }
