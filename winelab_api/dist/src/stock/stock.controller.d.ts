import { StockService } from './stock.service';
export declare class StockController {
    private stockService;
    constructor(stockService: StockService);
    findAll(): Promise<({
        warehouse: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            address: string | null;
        };
        product: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            sku: string;
            category: string;
            imageUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        quantity: number;
        productId: string;
        reserved: number;
        minQuantity: number;
    })[]>;
    findOne(id: string): Promise<{
        warehouse: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            address: string | null;
        };
        product: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            sku: string;
            category: string;
            imageUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        quantity: number;
        productId: string;
        reserved: number;
        minQuantity: number;
    }>;
    create(data: {
        productId: string;
        warehouseId: string;
        quantity: number;
        minQuantity?: number;
    }): Promise<{
        warehouse: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            address: string | null;
        };
        product: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            sku: string;
            category: string;
            imageUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        quantity: number;
        productId: string;
        reserved: number;
        minQuantity: number;
    }>;
    update(id: string, data: {
        minQuantity?: number;
    }): Promise<{
        warehouse: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            address: string | null;
        };
        product: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            sku: string;
            category: string;
            imageUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        quantity: number;
        productId: string;
        reserved: number;
        minQuantity: number;
    }>;
    adjust(id: string, data: {
        delta: number;
    }): Promise<{
        warehouse: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            address: string | null;
        };
        product: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            sku: string;
            category: string;
            imageUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        quantity: number;
        productId: string;
        reserved: number;
        minQuantity: number;
    }>;
    delete(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        quantity: number;
        productId: string;
        reserved: number;
        minQuantity: number;
    }>;
}
