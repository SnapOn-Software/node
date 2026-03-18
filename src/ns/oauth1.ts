import { IDictionary, isNullOrUndefined, newGuid, parseQueryString } from "@kwiz/common";
import { createHmac } from "crypto";

export type tnsOAuthRequestMethods = "get" | "post" | "patch" | "delete" | "put";
export interface insOAuth1RequestConfig {
    key: string;
    secret: string;
}
interface insOauthToken {
    token: string, tokenSecret: string, account: string,
    callback?: string,
    verifier?: string
}

export class nsOAuth1 {
    private version = '1.0';
    private signatureMethod = 'HMAC-SHA256';
    private consumer: { key: string, secret: string } = null;

    public constructor(requestConfig: insOAuth1RequestConfig) {
        if (isNullOrUndefined(requestConfig)) throw new Error('Missing parameters --key or --secret when using -m or --vm.');
        this._initializeConfig(requestConfig);
    }
    private _setConsumer(key: string, secret: string) {
        if (key && secret) {
            this.consumer = { key: key, secret: secret };
        }
    }
    private _getParameterString(oauthHeaders: IDictionary<string | number>, request: { url: string }) {
        var url = request.url
        var searchParams = parseQueryString(url);
        var params = this._sortObject({ ...oauthHeaders, ...searchParams });

        var paramsString = params
            .map(function (param) {
                return param.name + "=" + param.value;
            })
            .join('&');
        return paramsString;
    }
    private _getSigningKey(tokenSecret: string) {
        if (tokenSecret === void 0) { tokenSecret = ''; }
        var signingKey = [this._encode(this.consumer.secret), this._encode(tokenSecret)].join('&');
        return signingKey;
    }
    private _getSignature(baseString: string, tokenSecret: string) {
        var key = this._getSigningKey(tokenSecret);
        var hmacsignature = createHmac('sha256', Buffer.from(key, 'utf8'))
            .update(baseString)
            .digest()
            .toString('base64');
        return hmacsignature;
    }
    private _getRestSignature(oauthHeaders: IDictionary<string | number>, request: { method: string, url: string }, tokenSecret: string) {
        var method = request.method, url = request.url;
        var baseUrl = url.split('?')[0];
        var baseString = [
            method.toUpperCase(),
            this._encode(baseUrl.toLowerCase()),
            this._encode(this._getParameterString(oauthHeaders, request))
        ].join('&');
        return this._getSignature(baseString, tokenSecret);
    }
    private _getSoapSignature(account: string, token: insOauthToken, nonce: string, timestamp: number) {
        //https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1534941088.html#subsect_1520523663
        var baseString = [account, this.consumer.key, token.token, nonce, timestamp].join('&');
        return this._getSignature(baseString, token.tokenSecret);
    }
    private _encode(data: string | number) {
        return encodeURIComponent(data)
            .replace(/!/g, '%21')
            .replace(/\*/g, '%2A')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29');
    }
    private _sortObject(headers: IDictionary<string | number>) {
        var _this = this;
        var keys = Object.keys(headers).sort();
        return keys.map(function (name) {
            return { name: _this._encode(name), value: _this._encode(headers[name]) };
        });
    }
    private _getTimestamp() {
        let now = new Date(new Date().toUTCString());
        return Math.round(now.getTime() / 1000);
    }
    private _getNonce() {
        return newGuid().replace(/-/g, '');
    }
    public _getSoapAuthHeader(authToken: insOauthToken) {
        var nonce = this._getNonce();
        var timestamp = this._getTimestamp();
        var account = authToken.account, token = authToken.token;
        var signature = this._getSoapSignature(account, authToken, nonce, timestamp);
        return {
            token: token,
            signature: signature,
            nonce: nonce,
            timestamp: timestamp,
            account: account,
            consumerKey: this.consumer.key
        };
    }
    public _getRestAuthHeader(request: { method: tnsOAuthRequestMethods, url: string }, token: insOauthToken) {
        var HEADER = 'OAuth';
        var oauthHeaders: IDictionary<string | number> = {
            oauth_consumer_key: this.consumer.key,
            oauth_timestamp: this._getTimestamp(),
            oauth_nonce: this._getNonce(),
            oauth_version: this.version,
            oauth_signature_method: this.signatureMethod
        };
        if (token.token) {
            oauthHeaders.oauth_token = token.token;
        }
        if (token.callback) {
            oauthHeaders.oauth_callback = token.callback;
        }
        if (token.verifier) {
            oauthHeaders.oauth_verifier = token.verifier;
        }
        oauthHeaders.oauth_signature = this._getRestSignature(oauthHeaders, request, token.tokenSecret);
        var sortedHeaders = this._sortObject(oauthHeaders);
        var account = token.account;
        if (account) {
            sortedHeaders.push({ name: 'realm', value: account.replace('-', '_') });
        }
        var headerString = sortedHeaders
            .map(function (header) {
                return header.name + "=\"" + header.value + "\"";
            })
            .join(', ');
        return HEADER + " " + headerString;
    }
    private _initializeConfig(requestConfig: insOAuth1RequestConfig) {
        this._setConsumer(requestConfig.key, requestConfig.secret);
    }
}