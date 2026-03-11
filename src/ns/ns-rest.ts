import { getNSSuitetalkApiHost, tnsContext } from "@kwiz/common";
import { getNSRESTResponse, insRestOptions } from "./ns";

//Valid filters: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1545222128.html#Record-Collection-Filtering
//REST API documentation: https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2023.1/index.html#/definitions/contact
//https://timdietrich.me/blog/netsuite-suitetalk-rest-overview-issues-advice/

/** pass in a type for a single result or type[] for a collection result */
export async function callNSRest<T>(
    ctx: tnsContext,
    /** API path after the services/rest/record/v1/ - or starts with / to call other non services-rest endpoints lie /services/rest/auth */
    path: string, options?: insRestOptions<T> & {
        queryString?: {
            /** select fields - split by , */
            fields?: string;
            [param: string]: string;
        }
    }) {
    let query = Object.keys(options?.queryString || {}).map((qs, index) => `${index === 0 ? '?' : '&'}${qs}=${encodeURIComponent(options.queryString[qs])}`).join('');

    const url = `${getNSSuitetalkApiHost(ctx.accountId)}${path.startsWith('/') ? path : `/services/rest/record/v1/${path}`}${query}`;

    return await getNSRESTResponse<T>(ctx, url, options);
}