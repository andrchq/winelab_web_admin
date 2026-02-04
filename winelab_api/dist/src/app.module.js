"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const products_module_1 = require("./products/products.module");
const stock_module_1 = require("./stock/stock.module");
const warehouses_module_1 = require("./warehouses/warehouses.module");
const assets_module_1 = require("./assets/assets.module");
const stores_module_1 = require("./stores/stores.module");
const requests_module_1 = require("./requests/requests.module");
const shipments_module_1 = require("./shipments/shipments.module");
const deliveries_module_1 = require("./deliveries/deliveries.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const events_module_1 = require("./events/events.module");
const receiving_module_1 = require("./receiving/receiving.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            products_module_1.ProductsModule,
            stock_module_1.StockModule,
            warehouses_module_1.WarehousesModule,
            assets_module_1.AssetsModule,
            stores_module_1.StoresModule,
            requests_module_1.RequestsModule,
            shipments_module_1.ShipmentsModule,
            deliveries_module_1.DeliveriesModule,
            dashboard_module_1.DashboardModule,
            events_module_1.EventsModule,
            receiving_module_1.ReceivingModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map