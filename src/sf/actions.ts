import { SaveResult } from "@jsforce/jsforce-node";
import { CustomField, SaveResult as upsertSaveResult } from "@jsforce/jsforce-node/lib/api/metadata";
import { chunkArray, forEachAsync, GetError, IDictionary, iFileData, isNotEmptyString, isNullOrEmptyString, isNullOrUndefined } from "@kwiz/common";
import { sf_custom_field_name_suffix } from "./constants";
import { iSFEntity, iSFOrgInfo, sf_builtin_profiles, sf_conn, sf_field_ex, sf_field_value_types, sf_known_entities_type, sf_metadata_field_type, sf_metadata_field_types, sf_throttle } from "./types";

/** returns the user's name, or null if user not found. */
export async function sfGetUserName(conn: sf_conn) {
    try {
        let userId = conn.userInfo?.id;
        if (isNullOrEmptyString(userId)) {
            const identity = await conn.identity();
            //console.log(identity);
            if (isNotEmptyString(identity.display_name))
                return identity.display_name;
            userId = identity.user_id;
        }
        const ui = await conn.query("SELECT Name FROM User WHERE Id = '" + userId + "'");
        return ui.records[0].Name;
    } catch (e) {
        console.error(e);
        return null;
    }
}
export async function sfIsConnectionValid(conn: sf_conn) {
    const userName = await sfGetUserName(conn);
    return isNotEmptyString(userName);
}


export async function sfGetFields(conn: sf_conn, entity: sf_known_entities_type | string) {
    const ent = await conn!.sobject(entity).describe();
    return ent.fields as sf_field_ex[];
}

export async function sfGetRecords(conn: sf_conn, entity: sf_known_entities_type | string, select: string[] = ["Id, Name"], accessAsAppInstanceUrl?: string) {
    const records = await conn!.query(
        `SELECT ${select.join(', ')} FROM ${entity}`
    );
    return records;
}


export async function sfGetOrgInfo(conn: sf_conn): Promise<iSFOrgInfo | null> {
    const result = await conn?.query("SELECT Id, Name FROM Organization LIMIT 1");
    return {
        instanceUrl: conn!.instanceUrl,
        orgId: result!.records[0].Id!,
        orgName: result!.records[0].Name
    };
}

export async function sfGetObjects(conn: sf_conn): Promise<iSFEntity[]> {
    const objects = await conn!.describeGlobal();
    //console.log(objects);
    return objects.sobjects;
}


export async function sfCreateItem(conn: sf_conn, entity: string, values: IDictionary<sf_field_value_types>): Promise<SaveResult> {
    try {
        const sObject = conn!.sobject(entity);
        const result = await sObject.create(values, {
            headers: {
                //bypass duplicate check
                'Sforce-Duplicate-Rule-Header': 'allowSave=true'
            }
        });
        //console.log(result);
        return result;
    } catch (e) {
        const typedError = e as { errorCode: string; message: string; };
        return {
            success: false,
            errors: [{
                errorCode: typedError.errorCode || "unknown error",
                message: typedError.message || GetError(e) || "unexpected error"
            }]
        };
    }
}


export async function sfGetField(conn: sf_conn, entity: sf_known_entities_type | string, name: string) {
    return conn!.metadata.read("CustomField", `${entity}.${name}`);
}
export async function sfAddField(conn: sf_conn, info: sf_metadata_field_type): Promise<upsertSaveResult> {
    try {
        if (!info.fullName.endsWith(sf_custom_field_name_suffix))
            info.fullName = `${info.fullName}${sf_custom_field_name_suffix}`;
        const result = await conn!.metadata.create("CustomField", info as CustomField);

        //set visibiliy on new field

        //console.log(result);
        return result;
    } catch (e) {
        const typedError = e as { errorCode: string; message: string; };
        return {
            success: false,
            fullName: info.fullName,
            errors: [{
                statusCode: typedError.errorCode || "unknown error",
                message: typedError.message || GetError(e) || "unexpected error",
                extendedErrorDetails: [], fields: []
            }]
        };
    }
}
export async function sfUpdateField(conn: sf_conn, info: Partial<sf_metadata_field_type>): Promise<upsertSaveResult> {
    const field = await conn!.metadata.read("CustomField", info.fullName);
    if (!field) return {
        success: false,
        fullName: info.fullName,
        errors: [{ statusCode: "FIELD_NOT_FOUND", message: `Could not find field ${info.fullName}`, extendedErrorDetails: [], fields: [] }]
    };
    if (isNullOrUndefined(info.type)) info.type = field.type as sf_metadata_field_types;
    if (isNullOrEmptyString(info.label)) info.label = field.label;
    else if (field.type !== info.type) return {
        success: false,
        fullName: info.fullName,
        errors: [{ statusCode: "DO_NOT_CHANGE_TYPE", message: "Do not change field type - data loss risk", extendedErrorDetails: [], fields: [] }]
    };

    const result = await conn!.metadata.update("CustomField", info as CustomField);
    //console.log(result);
    return result;
}

export async function sfSetFieldPermissions(conn: sf_conn, fieldName: string) {
    try {
        //set visibiliy on new field
        const result = await conn?.query("SELECT Id, Name FROM Profile");
        const chunks = chunkArray([...sf_builtin_profiles, ...result!.records.map(r => r.Name)], sf_throttle);
        //no need to check anything - just run the update
        await forEachAsync(chunks, async names => {
            await conn!.metadata.update("Profile", names.map(name => ({
                fullName: name,
                fieldPermissions: [{
                    editable: true,
                    field: fieldName,
                    readable: true
                }]
            })));
        });

        //can check - but no need... faster to just update
        // await forEachAsync(chunks, async names => {
        //     let chunkProfiles = await conn!.metadata.read("Profile", names);
        //     chunkProfiles = chunkProfiles.filter(p => {
        //         if (isNullOrEmptyString(p.fullName)
        //             || isNullOrEmptyArray(p.fieldPermissions))
        //             return false;//skip system accounts

        //         const existing = firstOrNull(p.fieldPermissions, fp => fp.field === fieldName);
        //         if (existing && existing.editable && existing.readable)
        //             return false;//skip accounts that already have permissions set
        //         else {
        //             //make the change...
        //             if (existing) {
        //                 existing.editable = true;
        //                 existing.readable = true;
        //             }
        //             else p.fieldPermissions.push({
        //                 editable: true,
        //                 field: fieldName,
        //                 readable: true
        //             });
        //             return true;
        //         }
        //     });

        //     if (isNotEmptyArray(chunkProfiles)) {
        //         await conn!.metadata.update("Profile", chunkProfiles.map(p => ({
        //             fullName: p.fullName,
        //             fieldPermissions: p.fieldPermissions
        //         })));

        //         profilesToUpdate.push(...chunkProfiles);
        //     }
        // });

        return { success: true };
    } catch (e) {
        const typedError = e as { errorCode: string; message: string; };
        return {
            success: false,
            error: {
                statusCode: typedError.errorCode || "unknown error",
                message: typedError.message || GetError(e) || "unexpected error"
            }
        };
    }
}

export async function sfAttachFile(conn: sf_conn, itemId: string, file: iFileData) {
    const base64Marker = 'base64,';
    const base64 = (file.base64.indexOf(base64Marker) >= 0)
        ? file.base64.slice(file.base64.indexOf(base64Marker) + base64Marker.length)
        : file.base64;


    const res = await conn.sobject('ContentVersion').create({
        PathOnClient: file.filename,
        Title: file.filename,
        VersionData: base64
        // Add other fields as needed, e.g., Origin: 'C' for Chatter files
    });

    if (res.success) {
        //wait for it to be committed - get it from DB
        const docId = await conn.sobject('ContentVersion').retrieve(res.id); // await conn?.query(`SELECT contentdocumentid FROM ContentVersion where id = '${res.id}'`);

        //use it to make the link
        const linkRes = await conn.sobject('ContentDocumentLink').create({
            ContentDocumentId: docId.ContentDocumentId,
            LinkedEntityId: itemId,
            ShareType: 'V', // 'V' for Viewer, 'C' for Collaborator, 'I' for Inferred
            Visibility: 'AllUsers'
        });
        return linkRes.success;
    }
    return false;
}