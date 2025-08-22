import { Controller, All, Req, Res, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
    constructor(private readonly proxyService: ProxyService) { }

    @All('*')
    async handleAll(@Req() req: Request, @Res() res: Response, @Body() body: any) {
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const serviceName = this.proxyService.getServiceByPath(req.path);

        try {
            const result = await this.proxyService.proxyRequest(
                serviceName,
                req.originalUrl,
                req.method,
                body,
                req.headers,
            );

            res.status(200).json(result);
        } catch (error) {
            if (error.status) {
                res.status(error.status).json(error.data || { message: error.message });
            } else {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
}
