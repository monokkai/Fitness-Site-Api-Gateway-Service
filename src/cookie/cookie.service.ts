import { Injectable } from '@nestjs/common';

@Injectable()
export class CookieService {
    private metricsStorage: any[] = [];

    storeClientMetrics(data: any): { status: string } {
        this.metricsStorage.push(data);
        return { status: 'success' };
    }

    getMetrics(): any[] {
        return this.metricsStorage;
    }
}
