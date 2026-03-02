import { HttpStatusCode } from "axios";

/** forms API may be called from a sharepoint site, loaded client side. So those will make CORS requests to the forms authoring API */
export const apiResponseHeaders = {
    cors: {
        'Access-Control-Allow-Origin': '*'
    },
    cache: (min: number) => ({
        "Cache-Control": `public, max-age=${((min > 0 ? min : 5) * 60)}`
    }),
    html: {
        'Content-Type': 'text/html'
    }
};
/** pass to NextResponse.json or new NextResponse */
export function HttpRespond(o?: {
    /** true: 5 minutes, or minutes */
    cache?: boolean | number;
    cors?: boolean;
    html?: boolean;
    error?: boolean;
    status?: HttpStatusCode
}): ResponseInit {
    return o ? {
        headers: {
            ...(o?.cors ? apiResponseHeaders.cors : {}),
            ...(o?.cache ? apiResponseHeaders.cache(o.cache === true ? 5 : o.cache) : {}),
            ...(o?.html ? apiResponseHeaders.html : {})
        },
        status: o?.status || o?.error ? 500 : HttpStatusCode.Ok
    } : undefined;
}