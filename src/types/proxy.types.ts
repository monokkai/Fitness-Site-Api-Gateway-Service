export interface ServiceUrls {
    auth: string;
    training: string;
    guards: string;
    users: string;
}

export interface ProxyError {
    status: number;
    message: string;
    data?: any;
}

export interface HttpRequestOptions {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    data?: any;
    headers: Record<string, string>;
    timeout: number;
}
