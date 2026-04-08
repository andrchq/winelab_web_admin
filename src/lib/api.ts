// API Client for WineLab Admin

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
    private accessToken: string | null = null;

    setToken(token: string | null) {
        this.accessToken = token;
    }

    getToken(): string | null {
        return this.accessToken;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_URL}${endpoint}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (!this.accessToken && typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('accessToken');
            if (storedToken) {
                this.accessToken = storedToken;
            }
        }

        if (this.accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Network error' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        // Handle empty responses
        const text = await response.text();
        if (!text) return {} as T;

        return JSON.parse(text);
    }

    // GET request
    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    // POST request
    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // PATCH request
    async patch<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // DELETE request
    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

// Singleton instance
export const api = new ApiClient();

// Auth helpers
export function setAuthToken(token: string | null) {
    api.setToken(token);
    if (typeof window !== 'undefined') {
        if (token) {
            localStorage.setItem('accessToken', token);
        } else {
            localStorage.removeItem('accessToken');
        }
    }
}

export function getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('accessToken');
    }
    return null;
}

export function initializeAuth() {
    const token = getAuthToken();
    if (token) {
        api.setToken(token);
    }
}

export const inventoryApi = {
    getAll: () => api.get<any[]>('/inventory'),
    getOne: (id: string, search?: string) => api.get<any>(`/inventory/${id}${search ? `?search=${search}` : ''}`),
    start: (warehouseId: string) => api.post<any>('/inventory/start', { warehouseId }),
    scan: (id: string, barcode: string) => api.post<any>(`/inventory/${id}/scan`, { barcode }),
    setQuantityCount: (id: string, recordId: string, countedQuantity: number) =>
        api.patch<any>(`/inventory/${id}/quantity/${recordId}`, { countedQuantity }),
    finish: (id: string) => api.post<any>(`/inventory/${id}/finish`),
    applyAdjustments: (id: string) => api.post<any>(`/inventory/${id}/apply-adjustments`),
};

export const initialInventoryApi = {
    start: (warehouseId: string) => api.post<any>('/inventory/initial/start', { warehouseId }),
    getOne: (id: string) => api.get<any>(`/inventory/initial/${id}`),
    createEntry: (id: string, productId: string) => api.post<any>(`/inventory/initial/${id}/entries`, { productId }),
    addScan: (id: string, entryId: string, code: string) => api.post<any>(`/inventory/initial/${id}/entries/${entryId}/scans`, { code }),
    resolveScanConflict: (id: string, entryId: string, scanId: string) =>
        api.patch<any>(`/inventory/initial/${id}/entries/${entryId}/scans/${scanId}/review`),
    deleteScan: (id: string, entryId: string, scanId: string) => api.delete<any>(`/inventory/initial/${id}/entries/${entryId}/scans/${scanId}`),
    setQuantity: (id: string, entryId: string, quantity: number) => api.patch<any>(`/inventory/initial/${id}/entries/${entryId}/quantity`, { quantity }),
    deleteEntry: (id: string, entryId: string) => api.delete<any>(`/inventory/initial/${id}/entries/${entryId}`),
    apply: (id: string) => api.post<any>(`/inventory/initial/${id}/apply`),
};

export const requestApi = {
    create: (data: { title: string; description?: string; storeId: string; priority?: string }) =>
        api.post<any>('/requests', data),
    updateStatus: (id: string, data: { status: string; assigneeId?: string }) =>
        api.patch<any>(`/requests/${id}/status`, data),
    addComment: (id: string, text: string) =>
        api.post<any>(`/requests/${id}/comments`, { text }),
};

export const deliveryApi = {
    updateStatus: (
        id: string,
        data: { status: string; courierName?: string; courierPhone?: string },
    ) => api.patch<any>(`/deliveries/${id}/status`, data),
    syncProvider: (id: string) => api.post<any>(`/deliveries/${id}/sync-provider`),
};
