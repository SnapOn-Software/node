import { Connection, Field, Schema } from "@jsforce/jsforce-node";
import { ValueSet } from "@jsforce/jsforce-node/lib/api/metadata";
import { DescribeGlobalSObjectResult } from "@jsforce/jsforce-node/lib/api/soap/schema";
import { isNotEmptyString, toArray } from "@kwiz/common";
import { sf_metadata_field_type_info } from "./constants";

export const sf_unknown_user = "Unknown User";
export const sf_throttle = 10;
export const sf_instances = {
    default: "https://login.salesforce.com",
    sandbox: "https://test.salesforce.com"
};

//getting a built in profile name won't get the API name for it...
//https://salesforce.stackexchange.com/questions/159005/listing-of-all-standard-profiles-and-their-metadata-api-names
export const sf_builtin_profiles = [
    "Admin",
    "StandardAul",
    "Standard",
    "SolutionManager",
    "MarketingProfile",
    "HighVolumePortal",
    "ContractManager",
    "AuthenticatedWebsite"
];

export const sf_known_entities = {
    Lead: { Label: "Leads" },
    Account: { Label: "Accounts" }
};
export const sf_known_entities_arr = toArray(sf_known_entities, undefined, (k, e) => ({ key: k, ...e }));
export type sf_known_entities_type = keyof typeof sf_known_entities;

export type sf_field_value_types = string | boolean | number | Date;

export interface isf_cfg {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}
export interface isf_user_token {
    instanceUrl: string;
    accessToken: string;
    userName: string;
}

export type sf_conn = Connection<Schema>;


export interface iSFContext {
    /** instance url */
    instanceUrl: string;
};

export interface iSFEntityContext extends iSFContext {
    /** entity name */
    entity: string;
};

export function isSFContext(ctx: any): ctx is iSFContext {
    const asListContext = ctx as iSFContext;
    if (asListContext && isNotEmptyString(asListContext.instanceUrl)) {
        return true;
    }
    else return false;
}

export function isSFEntityContext(ctx: any): ctx is iSFEntityContext {
    const asListContext = ctx as iSFEntityContext;
    if (isSFContext(ctx) && isNotEmptyString(asListContext.entity)) {
        return true;
    }
    else return false;
}

export interface iSFEntity extends DescribeGlobalSObjectResult {

}

export interface iSFOrgInfo {
    instanceUrl: string;
    orgId: string;
    orgName: string;
}


export interface iPicklistValue {
    active: boolean;
    defaultValue: boolean;
    label: string;
    /** https://salesforce.stackexchange.com/questions/201775/picklists-validfor-attribute */
    validFor: string;
    value: string;
}


//unsupported: reference, id, 
export const sf_field_ex_type_info = {
    textarea: "Multiline text",
    string: "Text",
    picklist: "Choice",
    multipicklist: "Multi choice",
    email: "Email",
    phone: "Phone",
    url: "Url",
    int: "Number",
    double: "Number (double)",
    currency: "Currency",
    boolean: "Checkbox",
    date: "Date",
    datetime: "Date and time",
    percent: "Percent"
};
export type sf_field_ex_types = keyof typeof sf_field_ex_type_info;

export type sf_field_ex = (Omit<Field, "picklistValues" | "type"> & {
    picklistValues?: iPicklistValue[];
    //https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/field_types.htm
    type: sf_field_ex_types;
    extraTypeInfo?: "personname" | "imageurl" | "plaintextarea" | "richtextarea"
});

export interface iSFDesignerProps {
    ctx: iSFContext;
    container: HTMLDivElement;
    onRendered?: () => void;
}

export interface iSFBaseEntity<type = string> {
    attributes: {
        type: type;
        url: string;
    }
}


export type sf_metadata_field_types = keyof typeof sf_metadata_field_type_info;
export interface sf_metadata_field_base {
    /**`${entity}.${name}` */
    fullName: string;
    label: string;
    required: boolean;
    description?: string;
    inlineHelpText?: string;
}
export interface sf_metadata_field_text extends sf_metadata_field_base {
    type: "Text";
    /** 128 */
    length: number;
}
export interface sf_metadata_field_textarea extends sf_metadata_field_base {
    type: "TextArea";
}
export interface sf_metadata_field_html extends sf_metadata_field_base {
    type: "Html";
    /** 512 */
    length: number;
    /** 10 */
    visibleLines: number;
}

export interface sf_metadata_field_numeric extends sf_metadata_field_base {
    type: "Number" | "Currency" | "Percent";
    precision: number;
    scale: number;
}
export interface sf_metadata_field_checkbox extends sf_metadata_field_base {
    type: "Checkbox";
    defaultValue: boolean;
}
export interface sf_metadata_field_list extends sf_metadata_field_base {
    type: "Picklist";
    valueSet: Omit<ValueSet, "valueSettings"> & Required<Pick<ValueSet, 'valueSetDefinition'>>;
}
export interface sf_metadata_field_multiList extends sf_metadata_field_base {
    type: "MultiselectPicklist";
    valueSet: Omit<ValueSet, "valueSettings"> & Required<Pick<ValueSet, 'valueSetDefinition'>>;
    /** 10 */
    visibleLines: number;
}

type basicFieldTypes = Exclude<sf_metadata_field_types, "Text" | "TextArea" | "Html" | "Number" | "Currency" | "Percent" | "Checkbox" | "Picklist" | "MultiselectPicklist">;
export interface sf_metadata_field_basic extends sf_metadata_field_base {
    type: basicFieldTypes;
}

export type sf_metadata_field_type = sf_metadata_field_text | sf_metadata_field_textarea | sf_metadata_field_html | sf_metadata_field_checkbox | sf_metadata_field_list | sf_metadata_field_multiList | sf_metadata_field_basic | sf_metadata_field_numeric;