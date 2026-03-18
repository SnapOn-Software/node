import { getNsHost, isString, tnsContext } from "@kwiz/common";
import { getNSRESTResponse, insRestOptions } from "./ns";

/** T is a single item from the returned collection */
export async function callNSSuiteQL<T>(ctx: tnsContext,
    /* SuiteQL Query, or {q:string} with query */
    payload: {
        /* SuiteQL Query */
        q?: string;
        [param: string]: string;
    } | string,
    options?: Omit<insRestOptions<T>, "payload">
) {
    const url = `${getNsHost(ctx.accountId, "suitetalk")}/services/rest/query/v1/suiteql`;

    return await getNSRESTResponse<T[]>(ctx, url, {
        method: "post",
        payload: isString(payload) ? { q: payload } : payload,
        headers: {
            Prefer: "transient",//required only for suiteQL
            ...(options?.headers || {})
        }
    });
}