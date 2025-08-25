import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
    private readonly logger = new Logger(ProxyService.name);
    private services: any;

    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
    ) {
        this.services = {
            auth: this.configService.get<string>('AUTH_SERVICE_URL') || 'http://auth-service:80',
            training: this.configService.get<string>('TRAINING_SERVICE_URL') || 'http://training-service:3000',
            guards: this.configService.get<string>('GUARDS_SERVICE_URL') || 'http://guards-service:3003',
        };

        this.logger.log('Proxy service initialized with URLs:');
        this.logger.log(JSON.stringify(this.services, null, 2));
    }

    async proxyRequest(serviceName: string, originalUrl: string, method: string, body: any, headers: any) {
        const serviceUrl = this.services[serviceName];

        if (!serviceUrl) {
            throw new Error(`Сервис ${serviceName} не найден`);
        }

        const targetUrl = `${serviceUrl}${originalUrl}`;
        this.logger.log(`Proxying to: ${targetUrl}`);

        try {
            const response = await firstValueFrom(
                this.httpService.request({
                    url: targetUrl,
                    method: method as any,
                    data: body,
                    headers: {
                        ...headers,
                        'x-request-id': headers['x-request-id'] || 'unknown',
                        'host': new URL(serviceUrl).host,
                    },
                    timeout: 10000,
                })
            );

            return response.data;
        } catch (error) {
            this.logger.error(`Proxy error for ${targetUrl}:`, error);
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
        this.logger.log(`Routing path: ${path}`);

        if (path.startsWith('/cookie')) {
            throw new Error('Cookie routes should be handled locally');
        }
        if (path.startsWith('/api/auth')) return 'auth';
        if (path.startsWith('/api/training') || path.startsWith('/user-profiles') || path.startsWith('/workouts')) return 'training';
        if (path.startsWith('/auth/validate')) return 'guards';
        return 'auth';
    }
}
