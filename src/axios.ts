import { isNotEmptyString, isNullOrEmptyString } from "@kwiz/common";
import { AxiosError, AxiosRequestConfig } from "axios";
import { Agent, globalAgent } from "https";

type axiosConfigOptions = {
    contantType?: "application/json" | "application/json; odata=nometadata" | "application/xml";
}
export function getAxiosConfigBearer(token: string, options?: axiosConfigOptions) {
    return getAxiosConfig(`Bearer ${token}`, options);
}

export function getAxiosConfig(token?: string, options?: axiosConfigOptions) {
    //allow self sign ssl certificates
    globalAgent.options.rejectUnauthorized = false;
    const config: AxiosRequestConfig<any> = {
        httpAgent: new Agent({
            rejectUnauthorized: false
        }),
        headers: {}
    };

    if (!isNullOrEmptyString(token))
        config.headers!.Authorization = token;

    if (options) {
        if (!isNullOrEmptyString(options.contantType)) {
            config.headers!["Content-Type"] = options.contantType;
            config.headers!["Accept"] = options.contantType;
        }
    }
    return config;
}

export function getAxiosErrorData(error: AxiosError) {
    let code = error.code || "Unknown";
    let message = error.message || "Unspecified error";
    let data: string;
    if (error && error.response && error.response.data) {
        if (error.response.data["odata.error"]) {
            let errorData: { code: string; message: { value: string; }; } = error.response.data["odata.error"];
            if (errorData.message && errorData.message.value)
                message = errorData.message.value;
            if (errorData && errorData.code)
                code = errorData.code;
        } else if (isNotEmptyString(error.response.data)) {
            data = error.response.data;
        }
    }
    return {
        code, message,
        /** might contain sensitive information like tokens or connections */
        data
    };
}