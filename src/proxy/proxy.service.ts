import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ServiceUrls } from '../types/proxy.types';
import { AxiosRequestConfig } from 'axios';

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
    config?: AxiosRequestConfig;
    code?: string;
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
            users: this.configService.get<string>('USERS_SERVICE_URL') || 'http://users-service:3004',
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
        this.logger.debug(`Service: ${serviceName}, Method: ${method}`);

        try {
            const cleanHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(headers)) {
                if (value !== undefined && !this.shouldSkipHeader(key)) {
                    cleanHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
                }
            }

            delete cleanHeaders['host'];
            delete cleanHeaders['content-length'];

            const requestConfig: AxiosRequestConfig = {
                url: targetUrl,
                method: method as AxiosRequestConfig['method'],
                data: body,
                headers: cleanHeaders,
                timeout: 10000,
                validateStatus: (status) => status < 500,
            };

            this.logger.debug(`Request headers: ${JSON.stringify(cleanHeaders, null, 2)}`);

            const response = await firstValueFrom(
                this.httpService.request(requestConfig)
            );

            this.logger.debug(`Response status: ${response.status}`);
            return response.data;

        } catch (error: unknown) {
            this.logger.error(`Proxy error for ${targetUrl}:`, error);

            if (this.isAxiosError(error)) {
                const errorMessage = this.getErrorMessage(error);
                const statusCode = error.response?.status || 500;

                this.logger.error(`Axios error: ${statusCode} - ${errorMessage}`);

                if (error.code === 'ECONNREFUSED') {
                    throw new HttpException(
                        `Cannot connect to ${serviceName} service`,
                        503,
                        { cause: error }
                    );
                }

                throw new HttpException(
                    errorMessage,
                    statusCode,
                    { cause: error }
                );
            }

            this.logger.error('Unknown error type:', error);
            throw new HttpException('Internal server error', 500, { cause: error });
        }
    }

    private shouldSkipHeader(key: string): boolean {
        const skipHeaders = [
            'host',
            'content-length',
            'connection',
            'accept-encoding',
            'accept-language',
            'referer',
            'sec-fetch-mode',
            'sec-fetch-site',
            'sec-fetch-dest'
        ];
        return skipHeaders.includes(key.toLowerCase());
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
        if (error.code === 'ECONNREFUSED') {
            return `Service unavailable: Cannot connect to target service`;
        }

        if (error.code === 'ETIMEDOUT') {
            return `Service timeout: Request took too long`;
        }

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
        this.logger.log(`🔍 Routing path: ${path}`);

        if (path.startsWith('/cookie')) {
            throw new HttpException('Cookie routes should be handled locally', 400);
        }

        if (path.startsWith('/user-profiles') ||
            path.startsWith('/workouts') ||
            path.startsWith('/user-workouts') ||
            path.startsWith('/user-levels')) {
            this.logger.log('✅ Routing to training service');
            return 'training';
        }

        if (path.startsWith('/api/users')) {
            this.logger.log('✅ Routing to users service');
            return 'users';
        }

        if (path.startsWith('/api/auth')) {
            this.logger.log('✅ Routing to auth service');
            return 'auth';
        }

        if (path.startsWith('/auth/validate')) {
            return 'guards';
        }

        this.logger.warn(`Unknown path: ${path}, defaulting to auth`);
        return 'auth';
    }

    async checkServiceHealth(serviceName: keyof ServiceUrls): Promise<boolean> {
        const serviceUrl = this.services[serviceName];
        if (!serviceUrl) return false;

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${serviceUrl}/health`, {
                    timeout: 5000,
                    validateStatus: (status) => status < 500
                })
            );
            return response.status === 200;
        } catch (error) {
            this.logger.warn(`Service ${serviceName} health check failed:`, error);
            return false;
        }
    }

    getServiceUrl(serviceName: keyof ServiceUrls): string {
        return this.services[serviceName] || 'Not configured';
    }
}
