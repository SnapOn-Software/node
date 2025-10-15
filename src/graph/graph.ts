import { AuthContextType, ITenantInfo, isBoolean, isNotEmptyString, isNullOrUndefined } from "@kwiz/common";
import { GetMSALToken } from "../auth/msal";
import { getAxiosConfigBearer } from "../axios";

/** "https://graph.microsoft.com" */
export const graphScope = "https://graph.microsoft.com";

var auth: AuthContextType = null;
export function ConfigureGraphAuth(config?: AuthContextType) {
    auth = config;
}
export async function getAxiosConfigGraph(tenantInfo: ITenantInfo, options?: {
    /* use this token - if not provided, will use app-only token */
    userToken?: string;
    clearTokenCache?: boolean;
} | boolean) {
    if (isBoolean(options))//old signature had a clearCache boolean
        options = { clearTokenCache: options === true };

    if (isNullOrUndefined(auth)) throw Error("Call ConfigureGraphAuth first");

    // secret or certificate supported
    const token = isNotEmptyString(options?.userToken)
        ? options.userToken
        : await GetMSALToken(tenantInfo, graphScope, auth, options?.clearTokenCache);
    const config = getAxiosConfigBearer(token);
    return config;
}