import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleProxy(request, { params });
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleProxy(request, { params });
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleProxy(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleProxy(request, { params });
}

async function handleProxy(request: NextRequest, { params }: { params: { path: string[] } }) {
    const path = params.path.join('/');
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

    // Clean the backend URL (remove trailing slash if present)
    const baseUrl = backendUrl.replace(/\/$/, '');
    const url = new URL(`${baseUrl}/api/${path}${request.nextUrl.search}`);

    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

    try {
        const response = await fetch(url.toString(), {
            method: request.method,
            headers: request.headers,
            body,
            // For Cloud Run, we don't want to follow redirects internally if possible
            redirect: 'manual',
        });

        const data = await response.arrayBuffer();

        return new NextResponse(data, {
            status: response.status,
            headers: response.headers,
        });
    } catch (error: any) {
        console.error(`Proxy error for ${url}:`, error);
        return NextResponse.json(
            { error: `Failed to connect to backend: ${error.message}`, url: url.toString() },
            { status: 502 }
        );
    }
}
