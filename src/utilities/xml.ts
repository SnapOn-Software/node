import { parseStringPromise } from "xml2js";
import { stripPrefix } from "xml2js/lib/processors";

interface iOptions {
    attrkey?: string | undefined;
    charkey?: string | undefined;
    explicitCharkey?: boolean | undefined;
    trim?: boolean | undefined;
    normalizeTags?: boolean | undefined;
    normalize?: boolean | undefined;
    explicitRoot?: boolean | undefined;
    emptyTag?: (() => any) | string;
    explicitArray?: boolean | undefined;
    ignoreAttrs?: boolean | undefined;
    mergeAttrs?: boolean | undefined;
    validator?: Function | undefined;
    xmlns?: boolean | undefined;
    explicitChildren?: boolean | undefined;
    childkey?: string | undefined;
    preserveChildrenOrder?: boolean | undefined;
    charsAsChildren?: boolean | undefined;
    includeWhiteChars?: boolean | undefined;
    async?: boolean | undefined;
    strict?: boolean | undefined;
    attrNameProcessors?: Array<(name: string) => any> | undefined;
    attrValueProcessors?: Array<(value: string, name: string) => any> | undefined;
    tagNameProcessors?: Array<(name: string) => any> | undefined;
    valueProcessors?: Array<(value: string, name: string) => any> | undefined;
    chunkSize?: number | undefined;
}
export function parseXml<T>(xml: string, options?: iOptions) {
    xml = xml.replace(/\r/g, '');//\r\n will be replaced with " " instead of \n
    return parseStringPromise(xml, {
        normalize: true,
        trim: true,
        explicitRoot: false,
        explicitArray: false,
        xmlns: false,
        tagNameProcessors: [stripPrefix],
        //breaking values in text that have :
        //valueProcessors: [stripPrefix],
        attrNameProcessors: [name => {
            let names = name.split(":");
            return names[names.length - 1];
        }],
        attrValueProcessors: [stripPrefix],
        ...(options || {})
    }) as T;
}
