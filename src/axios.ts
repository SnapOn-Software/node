import { isNullOrEmptyString } from "@kwiz/common";
import { AxiosRequestConfig } from "axios";
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