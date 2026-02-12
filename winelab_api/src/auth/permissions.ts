export enum SystemPermission {
    // Users
    USER_READ = 'USER_READ',
    USER_CREATE = 'USER_CREATE',
    USER_UPDATE = 'USER_UPDATE',
    USER_DELETE = 'USER_DELETE',

    // Styles/Roles
    ROLE_READ = 'ROLE_READ',
    ROLE_CREATE = 'ROLE_CREATE',
    ROLE_UPDATE = 'ROLE_UPDATE',
    ROLE_DELETE = 'ROLE_DELETE',

    // Stores
    STORE_READ = 'STORE_READ',
    STORE_CREATE = 'STORE_CREATE',
    STORE_UPDATE = 'STORE_UPDATE',
    STORE_DELETE = 'STORE_DELETE',

    // Inventory/Assets
    ASSET_READ = 'ASSET_READ',
    ASSET_CREATE = 'ASSET_CREATE',
    ASSET_UPDATE = 'ASSET_UPDATE',
    ASSET_DELETE = 'ASSET_DELETE',

    // Requests
    REQUEST_READ = 'REQUEST_READ',
    REQUEST_CREATE = 'REQUEST_CREATE',
    REQUEST_UPDATE = 'REQUEST_UPDATE',
    REQUEST_DELETE = 'REQUEST_DELETE',

    // Warehouse/Stock
    WAREHOUSE_READ = 'WAREHOUSE_READ',
    WAREHOUSE_UPDATE = 'WAREHOUSE_UPDATE',
    STOCK_READ = 'STOCK_READ',
    STOCK_UPDATE = 'STOCK_UPDATE',

    // Receiving
    RECEIVING_READ = 'RECEIVING_READ',
    RECEIVING_CREATE = 'RECEIVING_CREATE',
    RECEIVING_UPDATE = 'RECEIVING_UPDATE',

    // Shipments
    SHIPMENT_READ = 'SHIPMENT_READ',
    SHIPMENT_CREATE = 'SHIPMENT_CREATE',
    SHIPMENT_UPDATE = 'SHIPMENT_UPDATE',

    // Deliveries
    DELIVERY_READ = 'DELIVERY_READ',
    DELIVERY_UPDATE = 'DELIVERY_UPDATE',

    // Products
    PRODUCT_READ = 'PRODUCT_READ',
    PRODUCT_CREATE = 'PRODUCT_CREATE',
    PRODUCT_UPDATE = 'PRODUCT_UPDATE',
    PRODUCT_DELETE = 'PRODUCT_DELETE',

    // Categorires
    CATEGORY_READ = 'CATEGORY_READ',
    CATEGORY_MANAGE = 'CATEGORY_MANAGE',
}

export const PERMISSION_CATEGORIES = {
    [SystemPermission.USER_READ]: 'Users',
    [SystemPermission.USER_CREATE]: 'Users',
    [SystemPermission.USER_UPDATE]: 'Users',
    [SystemPermission.USER_DELETE]: 'Users',

    [SystemPermission.ROLE_READ]: 'Roles',
    [SystemPermission.ROLE_CREATE]: 'Roles',
    [SystemPermission.ROLE_UPDATE]: 'Roles',
    [SystemPermission.ROLE_DELETE]: 'Roles',

    [SystemPermission.STORE_READ]: 'Stores',
    [SystemPermission.STORE_CREATE]: 'Stores',
    [SystemPermission.STORE_UPDATE]: 'Stores',
    [SystemPermission.STORE_DELETE]: 'Stores',

    [SystemPermission.ASSET_READ]: 'Assets',
    [SystemPermission.ASSET_CREATE]: 'Assets',
    [SystemPermission.ASSET_UPDATE]: 'Assets',
    [SystemPermission.ASSET_DELETE]: 'Assets',

    [SystemPermission.REQUEST_READ]: 'Requests',
    [SystemPermission.REQUEST_CREATE]: 'Requests',
    [SystemPermission.REQUEST_UPDATE]: 'Requests',
    [SystemPermission.REQUEST_DELETE]: 'Requests',

    [SystemPermission.WAREHOUSE_READ]: 'Warehouse',
    [SystemPermission.WAREHOUSE_UPDATE]: 'Warehouse',
    [SystemPermission.STOCK_READ]: 'Warehouse',
    [SystemPermission.STOCK_UPDATE]: 'Warehouse',

    [SystemPermission.RECEIVING_READ]: 'Warehouse',
    [SystemPermission.RECEIVING_CREATE]: 'Warehouse',
    [SystemPermission.RECEIVING_UPDATE]: 'Warehouse',

    [SystemPermission.SHIPMENT_READ]: 'Warehouse',
    [SystemPermission.SHIPMENT_CREATE]: 'Warehouse',
    [SystemPermission.SHIPMENT_UPDATE]: 'Warehouse',

    [SystemPermission.DELIVERY_READ]: 'Logistics',
    [SystemPermission.DELIVERY_UPDATE]: 'Logistics',

    [SystemPermission.PRODUCT_READ]: 'Catalog',
    [SystemPermission.PRODUCT_CREATE]: 'Catalog',
    [SystemPermission.PRODUCT_UPDATE]: 'Catalog',
    [SystemPermission.PRODUCT_DELETE]: 'Catalog',

    [SystemPermission.CATEGORY_READ]: 'Categories',
    [SystemPermission.CATEGORY_MANAGE]: 'Categories',
};
