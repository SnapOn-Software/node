import { getNSRestletsApiHost, IDictionary, tnsContext } from "@kwiz/common";
import { getNSRESTResponse, insRestOptions } from "./ns";

interface insTenantInfoRestlet {
    script: string,
    deploy: string
}

export async function callNSRestlet<T>(ctx: tnsContext, restlet: insTenantInfoRestlet,
    options?: insRestOptions<T> & {
        queryString?: IDictionary<string>;
    }) {
    const query = Object.keys(options?.queryString || {}).map(qs => `&${qs}=${encodeURIComponent(options.queryString[qs])}`).join('');
    //call custom script
    const url = `${getNSRestletsApiHost(ctx.accountId)}/app/site/hosting/restlet.nl?script=${restlet.script}&deploy=${restlet.deploy}${query}`;

    return getNSRESTResponse<T>(ctx, url, options);
}