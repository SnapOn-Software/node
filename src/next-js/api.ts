import { ConsoleLogger, isNotEmptyString, isNullOrUndefined, jsonParse } from "@kwiz/common";

/** get next request body as JSON. sometimes request.json() won't like the format... get it as string and we parse ourselves */
export async function getAsJson<T>(nextRequest: { text: () => Promise<string> }) {
    const logger = ConsoleLogger.get("getAsJson");

    //sometimes request.json() won't like the format... get it as string and we parse ourselves
    const asText = await nextRequest.text();
    let result: T;
    if (isNotEmptyString(asText)) {
        try { result = jsonParse<T>(asText); }
        catch (e) { logger.error(e); }
    }
    else {
        logger.error("Request body is empty");
        throw Error("Request body is empty");
    }
    if (isNullOrUndefined(result)) {
        logger.log("JSON parse failed");
        logger.log(asText);
        throw Error("Request body is not a valid JSON");
    }
    return result;
}
