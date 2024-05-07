import { ConfidentialClientApplication } from "@azure/msal-node";
import { AuthContextType, AuthenticationModes, ITenantInfo } from "@kwiz/common";
//find tenant id? https://login.microsoftonline.com/kwizcom.onmicrosoft.com/.well-known/openid-configuration
//https://stackoverflow.com/questions/54771270/msal-ad-token-not-valid-with-sharepoint-online-csom

var apps: { [tenant: string]: ConfidentialClientApplication } = {};

function GetApp(tenantInfo: ITenantInfo, auth: AuthContextType) {
    let key = `${tenantInfo.idOrName}|${auth.authenticationMode}`
    if (!apps[key]) {
        auth.authenticationMode === AuthenticationModes.clientSecret
            ? apps[key] = new ConfidentialClientApplication({
                auth: {
                    clientId: auth.clientId,
                    authority: tenantInfo.authorityUrl,
                    clientSecret: auth.clientSecret
                },

            })
            : apps[key] = new ConfidentialClientApplication({
                auth: {
                    clientId: auth.clientId,
                    authority: tenantInfo.authorityUrl,
                    clientCertificate: {
                        thumbprint: auth.thumbprint,
                        privateKey: auth.privateKey
                    }
                },

            });
    }
    return apps[key];
}

/** client secret not supported by SharePoint, must use certificate */
export async function GetMSALToken(tenantInfo: ITenantInfo, scope: string, auth: AuthContextType, clearCache?: boolean) {
    const app = GetApp(tenantInfo, auth);
    if (clearCache)
        app.clearCache();
    let token = await app.acquireTokenByClientCredential({
        scopes: [`${scope}/.default`]
    });
    return token.accessToken;
}