import { Controller, All, Req, Res, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
    constructor(private readonly proxyService: ProxyService) { }

    @All('*')
    async handleAll(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: unknown
    ): Promise<void> {
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (req.path.startsWith('/cookie')) {
            res.status(404).json({ message: 'Not handled by proxy' });
            return;
        }

        try {
            const serviceName = this.proxyService.getServiceByPath(req.path);

            const result = await this.proxyService.proxyRequest(
                serviceName,
                req.originalUrl,
                req.method,
                body,
                req.headers,
            );

            res.status(200).json(result);
        } catch (error: unknown) {
            if (error instanceof Error && 'status' in error) {
                const err = error as { status: number; message: string; data?: unknown };
                res.status(err.status).json(err.data || { message: err.message });
            } else {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
}
