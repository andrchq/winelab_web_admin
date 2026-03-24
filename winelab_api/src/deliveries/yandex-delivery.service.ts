import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type YandexRoutePoint = {
    point_id: number;
    visit_order: number;
    type: 'source' | 'destination';
    address: {
        fullname: string;
    };
    contact: {
        name: string;
        phone: string;
        email?: string;
    };
    skip_confirmation?: boolean;
};

type YandexItem = {
    extra_id: string;
    pickup_point: number;
    dropoff_point: number;
    title: string;
    quantity: number;
    cost_value: string;
    cost_currency: 'RUB';
    weight: number;
    size: {
        length: number;
        width: number;
        height: number;
    };
};

export type YandexClaimRequest = {
    auto_accept?: boolean;
    callback_properties?: {
        callback_url: string;
    };
    external_order_id?: string;
    referral_source?: string;
    route_points: YandexRoutePoint[];
    items: YandexItem[];
    skip_client_notify?: boolean;
};

export type YandexClaimResponse = {
    id: string;
    status: string;
    version: number;
    items?: Array<{
        title?: string;
        quantity?: number;
    }>;
};

type YandexSearchResponse = {
    claims?: Array<{
        id: string;
        status: string;
        version?: number;
        updated_ts?: string;
        performer_info?: {
            name?: string;
            phone?: string;
        };
    }>;
};

@Injectable()
export class YandexDeliveryService {
    constructor(private configService: ConfigService) {}

    isConfigured() {
        return Boolean(this.configService.get<string>('YANDEX_DELIVERY_TOKEN'));
    }

    ensureConfigured() {
        if (!this.isConfigured()) {
            throw new BadRequestException('Не настроен токен Yandex Delivery');
        }
    }

    async createClaim(requestId: string, payload: YandexClaimRequest) {
        this.ensureConfigured();
        return this.request<YandexClaimResponse>(
            `/b2b/cargo/integration/v2/claims/create?request_id=${encodeURIComponent(requestId)}`,
            {
                method: 'POST',
                body: payload,
            },
        );
    }

    async acceptClaim(claimId: string, version: number) {
        this.ensureConfigured();
        return this.request<YandexClaimResponse>(
            `/b2b/cargo/integration/v2/claims/accept?claim_id=${encodeURIComponent(claimId)}`,
            {
                method: 'POST',
                body: { version },
            },
        );
    }

    async findClaim(claimId: string) {
        this.ensureConfigured();
        const response = await this.request<YandexSearchResponse>(
            '/b2b/cargo/integration/v2/claims/search',
            {
                method: 'POST',
                body: {
                    claim_id: claimId,
                    limit: 1,
                    offset: 0,
                },
            },
        );

        return response.claims?.[0] || null;
    }

    private async request<T>(
        path: string,
        options: {
            method: 'GET' | 'POST';
            body?: unknown;
        },
    ): Promise<T> {
        const token = this.configService.get<string>('YANDEX_DELIVERY_TOKEN');
        const baseUrl = this.configService.get<string>('YANDEX_DELIVERY_BASE_URL') || 'https://b2b.taxi.yandex.net';

        const response = await fetch(`${baseUrl}${path}`, {
            method: options.method,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Language': 'ru',
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const payloadText = await response.text();
        const payload = payloadText ? JSON.parse(payloadText) : {};

        if (!response.ok) {
            const message =
                payload?.message ||
                payload?.code ||
                'Ошибка ответа Yandex Delivery';
            throw new BadRequestException(message);
        }

        return payload as T;
    }
}
