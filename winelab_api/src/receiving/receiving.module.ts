import { Module } from '@nestjs/common';
import { ReceivingController } from './receiving.controller';
import { ReceivingService } from './receiving.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, EventsModule, NotificationsModule],
    controllers: [ReceivingController],
    providers: [ReceivingService],
})
export class ReceivingModule { }
