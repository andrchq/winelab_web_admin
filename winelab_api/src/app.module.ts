import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { AssetsModule } from './assets/assets.module';
import { StoresModule } from './stores/stores.module';
import { RequestsModule } from './requests/requests.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EventsModule } from './events/events.module';
import { ReceivingModule } from './receiving/receiving.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        ProductsModule,
        StockModule,
        WarehousesModule,
        AssetsModule,
        StoresModule,
        RequestsModule,
        ShipmentsModule,
        DeliveriesModule,
        DashboardModule,
        EventsModule,
        ReceivingModule,
        CategoriesModule,
    ],
})
export class AppModule { }

