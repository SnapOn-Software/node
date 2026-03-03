import { BlobServiceClient } from "@azure/storage-blob";
import { apiResultType, GetError, isNotEmptyString, isNullOrEmptyString, isString, jsonParse, jsonStringify } from "@kwiz/common";

var connectionString: string = null;
export function ConfigureBlobStorage(config: { connectionString: string; }) {
    connectionString = config.connectionString;
}

/** only lowercase letters, 3-63, numbers or - */
export async function GetBlobAsString(container: string, name: string): Promise<apiResultType<string>> {
    return GetBlob<string>(container, name, "string");
}

/** only lowercase letters, 3-63, numbers or - */
export async function GetBlobAsJSON<Type>(container: string, name: string): Promise<apiResultType<Type>> {
    try {
        const res = await GetBlob<string>(container, name, "string");
        if (res.success === true)
            return { success: true, value: jsonParse<Type>(res.value) };
        else
            return res;
    } catch (e) {
        return { success: false, error: GetError(e) };
    }
}

/** only lowercase letters, 3-63, numbers or - */
export async function GetBlobAsBuffer(container: string, name: string): Promise<apiResultType<Buffer<ArrayBuffer>>> {
    return GetBlob<Buffer<ArrayBuffer>>(container, name, "buffer");
}

/** only lowercase letters, 3-63, numbers or - */
export async function SaveBlob(container: string, name: string, content: string | ArrayBuffer): Promise<apiResultType<string>> {
    try {
        const blobServiceClient = getBlobClient();

        const containerClient = blobServiceClient.getContainerClient(container);
        const createContainerResponse = await containerClient.createIfNotExists();
        if (isNotEmptyString(createContainerResponse.errorCode) && createContainerResponse.errorCode !== "ContainerAlreadyExists")
            throw Error(createContainerResponse.errorCode);

        const blockBlobClient = containerClient.getBlockBlobClient(name);
        const uploadBlobResponse = await blockBlobClient.upload(content, isString(content) ? content.length : content.byteLength,);
        if (isNotEmptyString(uploadBlobResponse.errorCode))
            throw Error(uploadBlobResponse.errorCode);
        return { success: true, value: uploadBlobResponse.requestId };
    } catch (e) {
        return { success: false, error: GetError(e) };
    }
}

/** only lowercase letters, 3-63, numbers or - */
export async function DeleteBlob(container: string, name: string): Promise<apiResultType<string>> {
    try {
        const blobServiceClient = getBlobClient();

        const containerClient = blobServiceClient.getContainerClient(container);
        const blockBlobClient = containerClient.getBlockBlobClient(name);
        const uploadBlobResponse = await blockBlobClient.deleteIfExists();
        if (isNotEmptyString(uploadBlobResponse.errorCode))
            throw Error(uploadBlobResponse.errorCode);
        return { success: true, value: uploadBlobResponse.requestId };
    } catch (e) {
        return { success: false, error: GetError(e) };
    }
}
type withSchema<T> = T & { schema: number; };
export class BlobStorageHelper<T> {
    private container: string;
    private name: string;
    private schema: number;
    private isValid: (data: T) => boolean;
    public constructor(init: {
        container: string;
        name: string;
        schema: number;
        isValid?: (data: T) => boolean;
    }) {
        this.container = init.container;
        this.name = init.name;
        this.schema = init.schema;
        this.isValid = init.isValid || (() => true);
    }
    public async get(skipSchemaCheck?: boolean) {
        const getJsonTry = await GetBlobAsJSON<withSchema<T>>(this.container, this.name);
        if (getJsonTry.success && (skipSchemaCheck || getJsonTry.value?.schema === this.schema)) {
            delete getJsonTry.value.schema;
            return this.isValid(getJsonTry.value) ? getJsonTry.value as T : null;
        }
        else return null;
    }
    public async save(value: T) {
        return SaveBlob(this.container, this.name, jsonStringify(<withSchema<T>>{ ...value, schema: this.schema }));
    }
    public async delete() {
        return DeleteBlob(this.container, this.name);
    }
}

function getBlobClient() {
    if (isNullOrEmptyString(connectionString)) throw Error("Call ConfigureTableStorage first");
    return BlobServiceClient.fromConnectionString(connectionString);
}
async function GetBlob<FileDataType = string | Buffer<ArrayBuffer>>(container: string, name: string, as: "string" | "buffer"): Promise<apiResultType<FileDataType>> {
    try {
        const blobServiceClient = getBlobClient();

        const containerClient = blobServiceClient.getContainerClient(container);
        const blobClient = containerClient.getBlobClient(name);

        const downloaded = await blobClient.download();
        const asValue: FileDataType = await (as === "string"
            ? streamToString(downloaded.readableStreamBody)
            : streamToBuffer(downloaded.readableStreamBody)) as FileDataType;

        return { success: true, value: asValue };
    } catch (e) {
        return { success: false, error: GetError(e) };
    }
}
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer<ArrayBuffer>> {
    const result = await new Promise<Buffer<ArrayBuffer>>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (data) => {
            chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
        });
        stream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        stream.on("error", reject);
    });
    return result;
}
async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const result = await streamToBuffer(stream);
    return result.toString();
}