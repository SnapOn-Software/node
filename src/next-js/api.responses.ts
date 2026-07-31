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
    },
    noCache: { "Cache-Control": "no-store" }
};
/** pass to NextResponse.json or new NextResponse */
export function HttpRespond(o?: {
    /** true: 5 minutes, or minutes, false: no-store, no value - ignored */
    cache?: boolean | number;
    cors?: boolean;
    html?: boolean;
    error?: boolean;
    status?: HttpStatusCode
}): ResponseInit {
    return o ? {
        headers: {
            ...(o?.cors ? apiResponseHeaders.cors : {}),
            ...(o?.cache
                ? apiResponseHeaders.cache(o.cache === true ? 5 : o.cache)
                : o?.cache === false//explicitly set to false
                    ? apiResponseHeaders.noCache
                    : {}),
            ...(o?.html ? apiResponseHeaders.html : {})
        },
        status: o?.status > 0 ?
            o.status
            : o?.error
                ? 500
                : HttpStatusCode.Ok
    } : undefined;
}