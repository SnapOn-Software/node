import { IDictionary, insSuiteTalkRecordResponseBase, insSuiteTalkRecordsResponseCollection, isNotEmptyString, isnsAccessToken, isnsTokenInfo, isNullOrUndefined, jsonParse, nsGetErrorDetails, tnsContext, tnsFieldValueTypes } from "@kwiz/common";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getAxiosConfig, getAxiosConfigBearer } from "../axios";
import { nsOAuth1, tnsOAuthRequestMethods } from "./oauth1";

type toResultType<DataType> = DataType extends (infer SingleDataItem)[] ? insSuiteTalkRecordsResponseCollection<SingleDataItem> : (DataType & insSuiteTalkRecordResponseBase);

export interface insRestOptions<DataType, ResultType = toResultType<DataType>> {
    method?: tnsOAuthRequestMethods;
    payload?: IDictionary<tnsFieldValueTypes>;
    headers?: IDictionary<string>;
    responseDigest?: (response: AxiosResponse) => ResultType;
}
/** url should start with . after the account id. */
export async function getNSRESTResponse<DataType, ResultType = toResultType<DataType>>
    (ctx: tnsContext, url: string, options?: insRestOptions<DataType, ResultType>)
    : Promise<ResultType> {
    let config: AxiosRequestConfig;
    let method: tnsOAuthRequestMethods = isNotEmptyString(options?.method)
        ? options.method
        : isNullOrUndefined(options?.payload)
            ? "get"
            : "post";

    if (isnsAccessToken(ctx)) {
        config = getAxiosConfigBearer(ctx.accessToken, { contentType: "application/json" });
    }
    else if (isnsTokenInfo(ctx)) {
        let oauth = new nsOAuth1({

            key: ctx.clientId,
            secret: ctx.clientSecret
        });
        let restAuthentication = oauth._getRestAuthHeader({
            url: url,
            method: method
        }, {
            account: ctx.accountId,
            token: ctx.tokenId,
            tokenSecret: ctx.tokenSecret
        });
        config = getAxiosConfig(restAuthentication, { contentType: "application/json" });
    }
    else throw Error("Invalid context");

    if (options?.headers) {
        Object.keys(options.headers).forEach(h => {
            config.headers[h] = options.headers[h];
        });
    }
    let result: AxiosResponse = null;
    try {
        switch (method) {
            case "patch":
                result = await axios.patch<DataType>(url, options.payload, config);
                break;
            case "post":
                result = await axios.post<DataType>(url, options.payload, config);
                break;
            case "put":
                result = await axios.put<DataType>(url, options.payload, config);
                break;
            case "delete":
                result = await axios.delete<DataType>(url, config);
                break;
            case "get":
            default:
                result = await axios.get<DataType>(url, config);
                break;
        }
    } catch (e) {
        const asError = nsGetErrorDetails(e);
        throw asError ? new Error(asError["o:errorDetails"]?.[0].detail || asError.title, { cause: e }) : e;
    }

    if (options?.responseDigest)
        return options.responseDigest(result);
    else if (typeof (result.data) === "string") {
        const parsed = jsonParse<ResultType>(result.data);
        return isNullOrUndefined(parsed) && isNotEmptyString(result.data) ? result.data as ResultType : parsed;
    }
    else
        return result.data as ResultType;
}