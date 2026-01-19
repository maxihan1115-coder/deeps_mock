import { NextRequest, NextResponse } from 'next/server';

// CORS 헤더 설정
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Hop-by-hop 헤더 목록 (프록시에서 전달하면 안 되는 헤더들)
const HOP_BY_HOP_HEADERS = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'host',
]);

// 허용된 HTTP 메서드
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

/**
 * CORS 헤더가 포함된 JSON 응답 생성
 */
function corsJson(data: unknown, init?: ResponseInit): NextResponse {
    const response = NextResponse.json(data, init);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

interface ProxyRequestBody {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
}

/**
 * API Proxy Endpoint
 * 
 * 로컬 개발 환경에서 EC2 서버 IP로 API 요청을 보내기 위한 프록시 엔드포인트
 * 
 * 요청 형식:
 * {
 *   "url": "https://target-api.com/endpoint",
 *   "method": "GET" | "POST" | etc,
 *   "headers": { ... },
 *   "body": { ... }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body: ProxyRequestBody = await request.json();
        const { url, method = 'GET', headers = {}, body: requestBody } = body;

        // 1. URL 검증
        if (!url) {
            return corsJson(
                { success: false, error: 'MISSING_URL', payload: 'URL is required' },
                { status: 400 }
            );
        }

        // URL 파싱 및 프로토콜 검증
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return corsJson(
                { success: false, error: 'INVALID_URL', payload: 'Invalid URL format' },
                { status: 400 }
            );
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return corsJson(
                { success: false, error: 'INVALID_PROTOCOL', payload: 'Only HTTP and HTTPS protocols are allowed' },
                { status: 400 }
            );
        }

        // 2. HTTP 메서드 검증
        const upperMethod = method.toUpperCase();
        if (!ALLOWED_METHODS.has(upperMethod)) {
            return corsJson(
                { success: false, error: 'INVALID_METHOD', payload: `Method ${method} is not allowed` },
                { status: 400 }
            );
        }

        // 3. 헤더 정리 (hop-by-hop 헤더 제거)
        const cleanHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
            if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
                cleanHeaders[key] = value;
            }
        }

        // 4. Fetch 옵션 구성
        const fetchOptions: RequestInit = {
            method: upperMethod,
            headers: cleanHeaders,
        };

        // GET/HEAD가 아닌 경우에만 body 추가
        if (requestBody && !['GET', 'HEAD'].includes(upperMethod)) {
            fetchOptions.body = typeof requestBody === 'string'
                ? requestBody
                : JSON.stringify(requestBody);
        }

        // 5. 실제 API 호출
        const response = await fetch(url, fetchOptions);

        // 6. 응답 헤더 정리
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
                responseHeaders[key] = value;
            }
        });

        // 7. Content-Type에 따라 응답 처리
        const contentType = response.headers.get('content-type') || '';
        let responseBody: unknown;

        if (contentType.includes('application/json')) {
            try {
                responseBody = await response.json();
            } catch {
                responseBody = await response.text();
            }
        } else if (contentType.includes('text/') || contentType.includes('application/xml')) {
            responseBody = await response.text();
        } else {
            // 바이너리 데이터 (이미지, PDF 등)는 base64로 인코딩
            const buffer = await response.arrayBuffer();
            responseBody = {
                _binary: true,
                _encoding: 'base64',
                data: Buffer.from(buffer).toString('base64'),
            };
        }

        // 8. 프록시 응답 반환
        return corsJson({
            success: true,
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: responseBody,
        });

    } catch (error: unknown) {
        console.error('[Proxy Error]:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return corsJson(
            {
                success: false,
                error: 'PROXY_ERROR',
                payload: errorMessage
            },
            { status: 500 }
        );
    }
}

/**
 * CORS Preflight 처리
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            ...CORS_HEADERS,
            'Access-Control-Max-Age': '86400',
        },
    });
}
