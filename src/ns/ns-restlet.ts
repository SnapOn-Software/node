import { getNsHost, IDictionary, tnsContext } from "@kwiz/common";
import { getNSRESTResponse, insRestOptions } from "./ns";

interface insTenantInfoRestlet {
    script: string,
    deploy: string
}

export async function callNSRestlet<T>(ctx: tnsContext, restlet: insTenantInfoRestlet,
    options?: insRestOptions<T, T> & {
        queryString?: IDictionary<string>;
    }) {
    const query = Object.keys(options?.queryString || {}).map(qs => `&${qs}=${encodeURIComponent(options.queryString[qs])}`).join('');
    //call custom script
    const url = `${getNsHost(ctx.accountId, "restlets")}/app/site/hosting/restlet.nl?script=${restlet.script}&deploy=${restlet.deploy}${query}`;

    return getNSRESTResponse<T, T>(ctx, url, options);
}