import { IDictionary, isNullOrUndefined } from "@kwiz/common";

const $$cache: IDictionary<{ expires: Date; value: any }> = {};

export async function getWithCache<T>(worker: () => Promise<{ success: boolean; value: T }>, info: {
    /** seconds */
    successCacheDuration: number;
    /** seconds */
    failedCacheDuration?: number;
    /** must be unique for your call! function name, and parameters */
    cacheKey: string;
    forceRefresh?: boolean;
}): Promise<T> {
    const now = new Date();
    //purge old values
    Object.keys($$cache).forEach(key => {
        if ($$cache[key].expires < now) delete $$cache[key];
    });

    let cached = info.forceRefresh ? null : $$cache[info.cacheKey];

    if (isNullOrUndefined(cached)) {
        const result = await worker();
        if (result.success) {
            $$cache[info.cacheKey] = {
                expires: new Date(new Date().getTime() + info.successCacheDuration * 1000),
                value: result.value
            };
        }
        else if (info.failedCacheDuration > 0) {
            $$cache[info.cacheKey] = {
                expires: new Date(new Date().getTime() + info.failedCacheDuration * 1000),
                value: result.value
            };
        }
    }
    return $$cache[info.cacheKey].value;
}