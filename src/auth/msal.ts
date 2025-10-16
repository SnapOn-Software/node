import { ConfidentialClientApplication } from "@azure/msal-node";
import { AuthContextType, AuthenticationModes, CommonLogger, GetError, ITenantInfo } from "@kwiz/common";
//find tenant id? https://login.microsoftonline.com/kwizcom.onmicrosoft.com/.well-known/openid-configuration
//https://stackoverflow.com/questions/54771270/msal-ad-token-not-valid-with-sharepoint-online-csom

const logger = new CommonLogger("msal");

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

/** Get app-only token. client secret not supported by SharePoint, must use certificate */
export async function GetMSALToken(tenantInfo: ITenantInfo, scope: string, auth: AuthContextType, clearCache?: boolean) {
    const app = GetApp(tenantInfo, auth);
    if (clearCache)
        app.clearCache();
    let token = await app.acquireTokenByClientCredential({
        scopes: [`${scope}/.default`]
    });
    return token.accessToken;
}

export interface iUserTokenAccountInfo {
    homeAccountId: string;
    environment: string;
    tenantId: string;
    username: string;
    localAccountId: string;
    name?: string;
}
export interface iUserTokenRequestInfo {
    scopes: string[];
    /** a page in your app that will get the code in query after user logs in, call GetMSALUserToken with that code */
    redirectUri: string;
    /** pass a state to the login uri page to validate and/or restore the user's app state (page he came from?) */
    state?: string;
    /** redeem a code from redirect  */
    code?: string;
    // this is used for client side, when there is local cache.
    // this flow is not relevant for server side, where there is no cache or cache is for different users/tenants
    // /** request a new token silently from account cache */
    // account?: iUserTokenAccountInfo;
}

/** Get user token.
 * if code or account proivded will attempt to get a token, otherwise will redirect the user
 * client secret not supported by SharePoint, must use certificate */
export async function GetMSALUserToken(tenantInfo: ITenantInfo, auth: AuthContextType, info: iUserTokenRequestInfo, clearCache?: boolean)
    : Promise<{
        success: true;
        accessToken: string;
        account: iUserTokenAccountInfo;
    } | { success: false; redirect: string; error?: string; }> {
    const app = GetApp(tenantInfo, auth);
    if (clearCache)
        app.clearCache();

    let error: string;
    // if (info.account) {
    //     try {
    //         const result = await app.acquireTokenSilent({
    //             account: info.account,
    //             scopes: info.scopes,
    //             redirectUri: info.redirectUri
    //         });
    //         return {
    //             success: true,
    //             accessToken: result.accessToken,
    //             account: result.account
    //         }
    //     } catch (e) {
    //         logger.error(e);
    //         error = `Could not get token for account: ${GetError(e)}`;
    //     }
    // }
    if (info.code) {
        try {
            const result = await app.acquireTokenByCode({
                code: info.code,
                scopes: info.scopes,
                redirectUri: info.redirectUri,
                state: info.state
            });
            return {
                success: true,
                accessToken: result.accessToken,
                account: result.account
            }
        } catch (e) {
            logger.error(e);
            error = `Could not redeem code: ${GetError(e)}`;
        }
    }

    const loginUrl = await app.getAuthCodeUrl(info);
    return { success: false, redirect: loginUrl, error };
}

export interface iMSALUseTokenOptions {
    /* use this token - if not provided, will use app-only token */
    token?: string;
    clearTokenCache?: boolean;
}