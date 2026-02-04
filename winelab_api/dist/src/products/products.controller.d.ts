import { ProductsService } from './products.service';
export declare class ProductsController {
    private productsService;
    constructor(productsService: ProductsService);
    findAll(): Promise<{
        stats: {
            stock: number;
            reserved: number;
            available: number;
        };
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        sku: string;
        category: string;
        imageUrl: string | null;
    }[]>;
    findOne(id: string): Promise<{
        assets: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string | null;
            productId: string;
            condition: import(".prisma/client").$Enums.AssetCondition;
            processStatus: import(".prisma/client").$Enums.AssetProcess;
            serialNumber: string;
            purchaseDate: Date | null;
            warrantyUntil: Date | null;
            notes: string | null;
            warehouseBinId: string | null;
            storeId: string | null;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        sku: string;
        category: string;
        imageUrl: string | null;
    }>;
    create(data: {
        name: string;
        sku: string;
        category: string;
        description?: string;
    }): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        sku: string;
        category: string;
        imageUrl: string | null;
    }>;
    update(id: string, data: {
        name?: string;
        category?: string;
        description?: string;
    }): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        sku: string;
        category: string;
        imageUrl: string | null;
    }>;
    delete(id: string): Promise<{
        message: string;
    }>;
}
