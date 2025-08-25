import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request & { id?: string }, res: Response, next: NextFunction) {
        req.id = randomUUID();
        next();
    }
}
