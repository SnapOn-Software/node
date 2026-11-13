import { ConsoleLogger, isFunction, isNotEmptyString, isNullOrUndefined, jsonParse } from "@kwiz/common";

/** get next request body as JSON. sometimes request.json() won't like the format... get it as string and we parse ourselves */
export async function getAsJson<T>(
    nextRequest: { text: () => Promise<string> },
    /** optional, pass a validate data function - will return null if object is not valid - and NOT throw an error */
    validate?: (value: unknown) => value is T
) {
    const logger = ConsoleLogger.get("getAsJson");

    //sometimes request.json() won't like the format... get it as string and we parse ourselves
    const asText = await nextRequest.text();
    let result: T;
    if (isNotEmptyString(asText)) {
        try {
            result = jsonParse<T>(asText);
            if (isFunction(validate) && !validate(result)) {
                logger.log("validate failed");
                logger.log(asText);
                return null;
            }
        }
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
