import { AuthContextType, GetMSALSiteScope, ITenantInfo, isBoolean, isNotEmptyString, isNullOrUndefined } from "@kwiz/common";
import { GetMSALToken } from "../auth/msal";
import { getAxiosConfigBearer } from "../axios";

var auth: AuthContextType = null;
export function ConfigureSPOAuth(config?: AuthContextType) {
    auth = config;
}
export async function getAxiosConfigSharePoint(tenantInfo: ITenantInfo, hostName: string, options?: {
    /* use this token - if not provided, will use app-only token */
    userToken?: string;
    clearTokenCache?: boolean;
} | boolean) {
    if (isBoolean(options))//old signature had a clearCache boolean
        options = { clearTokenCache: options === true };

    if (isNullOrUndefined(auth)) throw Error("Call ConfigureSPOAuth first");
    // only certificate supported
    // DisableCustomAppAuthentication property, that disable this kind of auth., however it can be overriden using this command:
    // Set-SPOTenant -DisableCustomAppAuthentication $false
    const token = isNotEmptyString(options?.userToken)
        ? options.userToken
        : await GetMSALToken(tenantInfo, GetMSALSiteScope(hostName), auth, options?.clearTokenCache);
    const config = getAxiosConfigBearer(token, { contantType: "application/json; odata=nometadata" });
    return config;
}