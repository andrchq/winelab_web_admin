import { PrismaService } from '../prisma/prisma.service';
export declare class StockService {
    private prisma;
    constructor(prisma: PrismaService);
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
        quantity?: number;
        minQuantity?: number;
        reserved?: number;
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
    adjust(id: string, delta: number): Promise<{
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
