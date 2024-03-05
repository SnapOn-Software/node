import { GetMSALSiteScope, isNullOrUndefined } from "@kwiz/common";
import { GetMSALToken } from "../auth/msal";
import { getAxiosConfigBearer } from "../axios";

var auth: any = null;
export function ConfigureSPOAuth(config?: any) {
    auth = config;
}
export async function getAxiosConfigSharePoint(tenantInfo: any, hostName: string) {
    if (isNullOrUndefined(auth)) throw Error("Call ConfigureSPOAuth first");
    // only certificate supported
    // DisableCustomAppAuthentication property, that disable this kind of auth., however it can be overriden using this command:
    // Set-SPOTenant -DisableCustomAppAuthentication $false
    let token = await GetMSALToken(tenantInfo, GetMSALSiteScope(hostName), auth);
    let config = getAxiosConfigBearer(token, { contantType: "application/json; odata=nometadata" });
    return config;
}