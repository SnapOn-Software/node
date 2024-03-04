import { AuthContextType, GetMSALSiteScope, ITenantInfo, isNullOrUndefined } from "@kwiz/common";
import { GetMSALToken } from "../auth/msal";
import { getAxiosConfigBearer } from "../axios";

var auth: AuthContextType = null;
export function ConfigureSPOAuth(config?: AuthContextType) {
    auth = config;
}
export async function getAxiosConfigSharePoint(tenantInfo: ITenantInfo, siteUrl: string) {
    if (isNullOrUndefined(auth)) throw Error("Call ConfigureSPOAuth first");
    // only certificate supported
    // DisableCustomAppAuthentication property, that disable this kind of auth., however it can be overriden using this command:
    // Set-SPOTenant -DisableCustomAppAuthentication $false
    let token = await GetMSALToken(tenantInfo, GetMSALSiteScope(siteUrl), auth);
    let config = getAxiosConfigBearer(token, { contantType: "application/json; odata=nometadata" });
    return config;
}
