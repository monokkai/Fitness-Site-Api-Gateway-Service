import { Controller, Post, HttpCode, Body, Req, Res } from '@nestjs/common';
import { CookieService } from './cookie.service';
import { Request, Response } from 'express';

interface CookieData {
    country?: string;
    language?: string;
    userAgent?: string;
    platform?: string;
    timezone?: string;
    timezoneOffset?: number;
    localTime?: string;
    referer?: string;
    screenResolution?: string;
    viewportSize?: string;
    deviceType?: string;
    cookieEnabled?: boolean;
    online?: boolean;
    languagePreferences?: string[];
    connectionType?: string;
    token?: string;
}

@Controller('cookie')
export class CookieController {
    constructor(private readonly cookieService: CookieService) { }

    @Post('client-data')
    @HttpCode(200)
    collectClientData(@Req() req: Request) {
        const clientIp = req.ip || (req.ips || []).join(', ');
        const userAgent = req.headers['user-agent'];
        const acceptLanguage = req.headers['accept-language'];
        const referrer = req.headers['referer'];
        const secChUa = req.headers['sec-ch-ua'];

        const primaryLanguage = acceptLanguage?.split(',')[0].split(';')[0] || 'unknown';

        const isMobile = /mobile/i.test(userAgent || '');
        const deviceType = isMobile ? 'mobile' : 'desktop';

        const clientData = {
            connection: {
                ip: clientIp,
                proxy: (req.ips || []).length > 1,
            },
            browser: {
                type: this.parseBrowserType(userAgent),
                version: this.parseBrowserVersion(userAgent),
                platform: this.parsePlatform(userAgent),
                isBot: this.isBot(userAgent),
                secChUa: secChUa,
            },
            language: {
                preferred: primaryLanguage,
                all: acceptLanguage,
            },
            device: {
                type: deviceType,
            },
            time: {
                serverTime: new Date().toISOString(),
            },
            network: {
                secure: req.secure,
                protocol: req.protocol,
            },
            meta: {
                referrer: referrer,
            },
        };

        return {
            success: true,
            data: clientData,
        };
    }

    @Post('set')
    @HttpCode(200)
    setCookie(
        @Res({ passthrough: true }) res: Response,
        @Body() body: CookieData,
        @Req() req: Request,
    ) {
        console.log('Received cookie set request with body:', body);

        const value = body?.token || 'default_' + Math.random().toString(36).substring(2);

        res.cookie('session_token', value, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        });

        const cookieOptions = {
            httpOnly: false,
            secure: false,
            sameSite: 'lax' as const,
            path: '/',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        };

        // Устанавливаем дополнительные куки
        if (body.country) res.cookie('country', body.country, cookieOptions);
        if (body.language) res.cookie('language', body.language, cookieOptions);
        if (body.userAgent) res.cookie('userAgent', body.userAgent, cookieOptions);
        if (body.platform) res.cookie('platform', body.platform, cookieOptions);
        if (body.timezone) res.cookie('timezone', body.timezone, cookieOptions);
        if (body.timezoneOffset) res.cookie('timezoneOffset', body.timezoneOffset.toString(), cookieOptions);
        if (body.localTime) res.cookie('localTime', body.localTime, cookieOptions);
        if (body.referer) res.cookie('referer', body.referer, cookieOptions);
        if (body.screenResolution) res.cookie('screenResolution', body.screenResolution, cookieOptions);
        if (body.viewportSize) res.cookie('viewportSize', body.viewportSize, cookieOptions);
        if (body.deviceType) res.cookie('deviceType', body.deviceType, cookieOptions);
        if (body.cookieEnabled !== undefined) res.cookie('cookieEnabled', body.cookieEnabled.toString(), cookieOptions);
        if (body.online !== undefined) res.cookie('online', body.online.toString(), cookieOptions);
        if (body.languagePreferences) res.cookie('languagePreferences', JSON.stringify(body.languagePreferences), cookieOptions);
        if (body.connectionType) res.cookie('connectionType', body.connectionType, cookieOptions);

        this.cookieService.storeClientMetrics({
            ...body,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return {
            status: 'success',
            message: 'Cookies set successfully',
        };
    }

    @Post('clear')
    @HttpCode(200)
    clearCookie(@Res({ passthrough: true }) res: Response) {
        const cookiesToClear = [
            'session_token', 'country', 'language', 'userAgent', 'platform',
            'timezone', 'timezoneOffset', 'localTime', 'referer', 'screenResolution',
            'viewportSize', 'deviceType', 'cookieEnabled', 'online', 'languagePreferences',
            'connectionType'
        ];

        cookiesToClear.forEach(cookieName => {
            res.clearCookie(cookieName, { path: '/' });
        });

        return { message: 'Cookies cleared' };
    }

    private parseBrowserType(ua?: string): string {
        if (!ua) return 'unknown';
        if (/chrome|chromium/i.test(ua)) return 'chrome';
        if (/firefox|fxios/i.test(ua)) return 'firefox';
        if (/safari/i.test(ua)) return 'safari';
        if (/opr|opera/i.test(ua)) return 'opera';
        if (/edg/i.test(ua)) return 'edge';
        if (/msie|trident/i.test(ua)) return 'ie';
        return 'unknown';
    }

    private parseBrowserVersion(ua?: string): string {
        const matches = ua?.match(/(chrome|firefox|version|opera|edge|safari)[\/\s](\d+)/i);
        return matches?.[2] || 'unknown';
    }

    private parsePlatform(ua?: string): string {
        if (!ua) return 'unknown';
        if (/windows/i.test(ua)) return 'windows';
        if (/macintosh|mac os/i.test(ua)) return 'mac';
        if (/linux/i.test(ua)) return 'linux';
        if (/android/i.test(ua)) return 'android';
        if (/ios|iphone|ipad/i.test(ua)) return 'ios';
        return 'unknown';
    }

    private isBot(ua?: string): boolean {
        return !!ua && /bot|spider|crawl|slurp|search/i.test(ua);
    }
}
