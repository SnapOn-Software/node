import { AuthContextType, ITenantInfo, isBoolean, isNotEmptyString, isNullOrUndefined } from "@kwiz/common";
import { GetMSALToken, iMSALUseTokenOptions } from "../auth/msal";
import { getAxiosConfigBearer } from "../axios";

/** "https://graph.microsoft.com" */
export const graphScope = "https://graph.microsoft.com";

var auth: AuthContextType = null;
export function ConfigureGraphAuth(config?: AuthContextType) {
    auth = config;
}
export async function getAxiosConfigGraph(tenantInfo: ITenantInfo, options?: iMSALUseTokenOptions | boolean) {
    if (isBoolean(options))//old signature had a clearCache boolean
        options = { clearTokenCache: options === true };

    if (isNullOrUndefined(auth)) throw Error("Call ConfigureGraphAuth first");

    // secret or certificate supported
    const token = isNotEmptyString(options?.token)
        ? options.token
        : await GetMSALToken(tenantInfo, graphScope, auth, options?.clearTokenCache);
    const config = getAxiosConfigBearer(token);
    return config;
}