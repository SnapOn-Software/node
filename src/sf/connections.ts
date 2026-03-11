import jsforce, { Connection } from "@jsforce/jsforce-node";
import { isNotEmptyString, jsonStringify } from "@kwiz/common";
import { sfGetUserName } from "./actions";
import { isf_cfg, isf_user_token, sf_instances } from "./types";

const useInstanceForLogin = true;//this is the preferred method
function getOauth2Config(cfg: isf_cfg, instanceUrl: string) {
    const loginUrl = useInstanceForLogin
        ? instanceUrl
        : instanceUrl.includes('.sandbox.my.salesforce.com') ? sf_instances.sandbox : sf_instances.default;
    return {
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
        redirectUri: cfg.redirectUri,
        loginUrl: loginUrl
    }
}

interface ISFTokenSuccess {
    access_token: string;//"*******************",
    instance_url: string;// "https://yourInstance.salesforce.com",
    id: string;// "https://login.salesforce.com/id/XXXXXXXXXXXXXXXXXX/XXXXXXXXXXXXXXXXXX",
    token_type: "Bearer";
    scope: string;// "id api",
    issued_at: string;// "1657741493799",
    signature: string;// "c2lnbmF0dXJl"
}
interface ISFTokenError {
    error: string;//'invalid_grant'
    error_description: string;//'no client credentials user enabled'

}
type SFTokenResponse = ISFTokenSuccess | ISFTokenError;
function hasTokenError(t: SFTokenResponse): t is ISFTokenError {
    return isNotEmptyString((t as ISFTokenError).error);
}

export async function sf_conn_app(cfg: isf_cfg, instanceUrl: string) {
    try {
        const oauth2Config = getOauth2Config(cfg, instanceUrl);

        //get app only token
        const buffer = Buffer.from(`${oauth2Config.clientId}:${oauth2Config.clientSecret}`, 'utf8');
        const base64EncodedString = buffer.toString('base64');
        const token = await fetch(`${instanceUrl}/services/oauth2/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${base64EncodedString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=client_credentials`
        });

        //get the token response
        const token_json = (await token.json()) as SFTokenResponse;
        if (hasTokenError(token_json)) {
            throw token_json;
        }

        //configure the connection
        const conn = new Connection({
            instanceUrl: token_json.instance_url,
            accessToken: token_json.access_token
        });

        return conn;

    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function sf_conn_user(cfg: isf_cfg, userToken: isf_user_token) {
    if (cfg && userToken) {
        const conn = new jsforce.Connection({
            oauth2: getOauth2Config(cfg, userToken.instanceUrl),
            instanceUrl: userToken.instanceUrl,
            accessToken: userToken.accessToken,
        });

        return conn;
    }
    return null;
}

/** your redirect page will get an authorization code. call sf_oauth2_authorize to exchange for an access token.
 * look for query params: code, error, error_description, state
 */
export function sf_signin_redirect(cfg: isf_cfg, state: string, sandbox?: boolean) {
    const redirectUrl = new jsforce.OAuth2(getOauth2Config(cfg, sandbox ? sf_instances.sandbox : sf_instances.default)).getAuthorizationUrl({
        //which page the user  came from
        state: jsonStringify(state)
    });
    return redirectUrl;
}

/** complete the user sign in flow, use the code to get an access token */
export async function sf_oauth2_authorize(cfg: isf_cfg, authorizationCode: string, sandbox?: boolean): Promise<isf_user_token> {
    const conn = new jsforce.Connection({
        oauth2: getOauth2Config(cfg, sandbox ? sf_instances.sandbox : sf_instances.default)
    });
    await conn.authorize(authorizationCode);

    const userName = await sfGetUserName(conn);

    return ({
        accessToken: conn.accessToken!,
        instanceUrl: conn.instanceUrl,
        userName
    });
}