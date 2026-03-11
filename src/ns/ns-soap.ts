//https://github.com/minmyatoo/netsuite-record-fetcher-ts/blob/main/oauth1Utils.ts
//get WSDL: https://www.netsuite.com/portal/developers/resources/suitetalk-documentation.shtml
//https://www.npmjs.com/package/wsdl-tsclient
//https://www.npmjs.com/package/wsdl-to-ts
//https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2018_1/schema/record/address.html?mode=package

import { GetError, capitalizeFirstLetter, getNSSuitetalkApiHost, insBaseResponse, insSoapResponseError, insTokenInfo, tnsSoapRequest } from "@kwiz/common";
import axios, { AxiosError, AxiosResponse, isAxiosError } from "axios";
import { parseXml } from "../utilities/xml";
import { nsOAuth1 } from "./oauth1";

export class NSSoapRequestTypes {
    public tagName: string;
    public requestName: string;
    public constructor(name: tnsSoapRequest) {
        this.tagName = name;
        this.requestName = `${capitalizeFirstLetter(name)}Request`;
    }
    public static get = new NSSoapRequestTypes("get");
    /** getAll only allows for GetAllRecordType types.
     * Payload should be: <record recordType="currency"/> for example */
    public static getAll = new NSSoapRequestTypes("getAll");
    public static upsert = new NSSoapRequestTypes("upsert");
    public static update = new NSSoapRequestTypes("update");
    public static upsertList = new NSSoapRequestTypes("upsertList");
    public static search = new NSSoapRequestTypes("search");
    public static add = new NSSoapRequestTypes("add");
    public static delete = new NSSoapRequestTypes("delete");
};

export async function callNSSoap<T extends insBaseResponse>(ctx: insTokenInfo, requestType: NSSoapRequestTypes, payload: string, options?: {
    additionalHeaders?: string;
}): Promise<{ error?: false, envelope: T, axiosResponse?: AxiosResponse } | { error: true, errorMessage: string, envelope?: insSoapResponseError, axiosError?: AxiosError }> {
    const NSSoapURL = `${getNSSuitetalkApiHost(ctx.accountId)}/services/NetSuitePort_2023_1`;

    let oauth = new nsOAuth1({
        key: ctx.clientId,
        secret: ctx.clientSecret
    });

    let soapAuthentication = oauth._getSoapAuthHeader({
        account: ctx.accountId,
        token: ctx.tokenId,
        tokenSecret: ctx.tokenSecret
    });

    let body = `<soapenv:Envelope
xmlns:xsd='http://www.w3.org/2001/XMLSchema'
xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/'
xmlns:platformCore='urn:core_2023_1.platform.webservices.netsuite.com'
xmlns:actSched='urn:scheduling_2023_1.activities.webservices.netsuite.com'
xmlns:listRel='urn:relationships_2023_1.lists.webservices.netsuite.com'
xmlns:platformCommon='urn:common_2023_1.platform.webservices.netsuite.com'
xmlns:generalComm='urn:communication_2023_1.general.webservices.netsuite.com'
xmlns:platformMsgs='urn:messages_2023_1.platform.webservices.netsuite.com'>
    <soapenv:Header>
        <tokenPassport xsi:type='platformCore:TokenPassport'>
            <account xsi:type='xsd:string'>${soapAuthentication.account}</account>
            <consumerKey xsi:type='xsd:string'>${soapAuthentication.consumerKey}</consumerKey>
            <token xsi:type='xsd:string'>${soapAuthentication.token}</token>
            <nonce xsi:type='xsd:string'>${soapAuthentication.nonce}</nonce>
            <timestamp xsi:type='xsd:long'>${soapAuthentication.timestamp}</timestamp>
            <signature algorithm='HMAC_SHA256' xsi:type='platformCore:TokenPassportSignature'>${soapAuthentication.signature}</signature>
        </tokenPassport>
${options && options.additionalHeaders || ""}
    </soapenv:Header>
    <soapenv:Body>
        <${requestType.tagName} xsi:type='platformMsgs:${requestType.requestName}'>${payload}</${requestType.tagName}>
    </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const axiosResponse = await axios.post(NSSoapURL, body, {
            headers: {
                "Content-Type": "text/xml",
                "SOAPAction": requestType.tagName,
                Accept: "application/xml"
            }
        });
        const envelope = parseXml<T>(axiosResponse.data);
        return { envelope, axiosResponse };
    } catch (e) {
        if (isAxiosError(e)) {
            try {
                const envelope = parseXml<insSoapResponseError>(e.response.data);
                return {
                    error: true,
                    errorMessage: envelope.Body.Fault.faultstring,
                    envelope,
                    axiosError: e
                };
            } catch (e2) {
                return {
                    error: true,
                    errorMessage: e.message,
                    axiosError: e
                }
            }
        }

        return { error: true, errorMessage: GetError(e) };
    }
}