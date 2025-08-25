import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ServiceUrls, HttpRequestOptions } from '../types/proxy.types';

interface AxiosErrorResponse {
    status?: number;
    data?: {
        message?: string;
        [key: string]: unknown;
    };
}

interface AxiosError extends Error {
    response?: AxiosErrorResponse;
    isAxiosError?: boolean;
}

@Injectable()
export class ProxyService {
    private readonly logger = new Logger(ProxyService.name);
    private services: ServiceUrls;

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

    async proxyRequest(
        serviceName: keyof ServiceUrls,
        originalUrl: string,
        method: string,
        body: unknown,
        headers: Record<string, string | string[] | undefined>
    ): Promise<unknown> {
        const serviceUrl = this.services[serviceName];

        if (!serviceUrl) {
            throw new HttpException(`Сервис ${serviceName} не найден`, 404);
        }

        const targetUrl = `${serviceUrl}${originalUrl}`;
        this.logger.log(`Proxying to: ${targetUrl}`);

        try {
            const cleanHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(headers)) {
                if (value !== undefined) {
                    cleanHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
                }
            }

            const requestOptions: HttpRequestOptions = {
                url: targetUrl,
                method: this.validateHttpMethod(method),
                data: body,
                headers: {
                    ...cleanHeaders,
                    'x-request-id': cleanHeaders['x-request-id'] || 'unknown',
                    'host': new URL(serviceUrl).host,
                },
                timeout: 10000,
            };

            const response = await firstValueFrom(
                this.httpService.request(requestOptions)
            );

            return response.data;
        } catch (error: unknown) {
            this.logger.error(`Proxy error for ${targetUrl}:`, error);

            if (this.isAxiosError(error)) {
                const errorMessage = this.getErrorMessage(error);
                const statusCode = error.response?.status || 500;

                throw new HttpException(
                    errorMessage,
                    statusCode,
                    { cause: error }
                );
            }

            throw new HttpException('Internal server error', 500, { cause: error });
        }
    }

    private validateHttpMethod(method: string): HttpRequestOptions['method'] {
        const validMethods: HttpRequestOptions['method'][] = [
            'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
        ];

        if (validMethods.includes(method as HttpRequestOptions['method'])) {
            return method as HttpRequestOptions['method'];
        }

        return 'GET';
    }

    private isAxiosError(error: unknown): error is AxiosError {
        return (
            typeof error === 'object' &&
            error !== null &&
            'isAxiosError' in error &&
            (error as AxiosError).isAxiosError === true
        );
    }

    private getErrorMessage(error: AxiosError): string {
        if (error.response?.data) {
            const responseData = error.response.data;

            if (typeof responseData === 'object' && responseData !== null) {
                if ('message' in responseData && typeof responseData.message === 'string') {
                    return responseData.message;
                }
                if ('error' in responseData && typeof responseData.error === 'string') {
                    return responseData.error;
                }
                return JSON.stringify(responseData);
            }

            if (typeof responseData === 'string') {
                return responseData;
            }
        }

        return error.message || 'Unknown error occurred';
    }

    getServiceByPath(path: string): keyof ServiceUrls {
        this.logger.log(`Routing path: ${path}`);

        if (path.startsWith('/cookie')) {
            throw new HttpException('Cookie routes should be handled locally', 400);
        }
        if (path.startsWith('/api/auth')) return 'auth';
        if (path.startsWith('/api/training') || path.startsWith('/user-profiles') || path.startsWith('/workouts')) return 'training';
        if (path.startsWith('/auth/validate')) return 'guards';
        return 'auth';
    }
}
