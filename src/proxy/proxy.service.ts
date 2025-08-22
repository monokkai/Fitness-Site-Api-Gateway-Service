import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
    private services: any;

    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
    ) {
        this.services = {
            auth: this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001',
            training: this.configService.get<string>('TRAINING_SERVICE_URL') || 'http://localhost:3002',
            cookie: this.configService.get<string>('COOKIE_SERVICE_URL') || 'http://localhost:3003',
            guards: this.configService.get<string>('GUARDS_SERVICE_URL') || 'http://localhost:3004',
        };
    }

    async proxyRequest(serviceName: string, originalUrl: string, method: string, body: any, headers: any) {
        const serviceUrl = this.services[serviceName];

        if (!serviceUrl) {
            throw new Error(`Сервис ${serviceName} не найден`);
        }

        const targetUrl = `${serviceUrl}${originalUrl}`;

        try {
            const response = await firstValueFrom(
                this.httpService.request({
                    url: targetUrl,
                    method: method as any,
                    data: body,
                    headers: {
                        ...headers,
                        'x-request-id': headers['x-request-id'] || 'unknown',
                        'origin': undefined,
                        'referer': undefined,
                    },
                })
            );

            return response.data;
        } catch (error) {
            if (error.response) {
                throw {
                    status: error.response.status,
                    message: error.response.data?.message || error.message,
                    data: error.response.data,
                };
            }
            throw error;
        }
    }

    getServiceByPath(path: string): string {
        if (path.startsWith('/api/auth')) return 'auth';
        if (path.startsWith('/api/training') || path.startsWith('/user-profiles') || path.startsWith('/workouts')) return 'training';
        if (path.startsWith('/cookie')) return 'cookie';
        if (path.startsWith('/auth/validate')) return 'guards';
        return 'auth';
    }
}
