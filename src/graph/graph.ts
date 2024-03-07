import { AuthContextType, ITenantInfo, isNullOrUndefined } from "@kwiz/common";
import { GetMSALToken } from "../auth/msal";
import { getAxiosConfigBearer } from "../axios";

/** "https://graph.microsoft.com" */
export const graphScope = "https://graph.microsoft.com";

var auth: AuthContextType = null;
export function ConfigureGraphAuth(config?: AuthContextType) {
    auth = config;
}
export async function getAxiosConfigGraph(tenantInfo: ITenantInfo) {
    if (isNullOrUndefined(auth)) throw Error("Call ConfigureGraphAuth first");

    // secret or certificate supported
    let token = await GetMSALToken(tenantInfo, graphScope, auth);
    return getAxiosConfigBearer(token);
}