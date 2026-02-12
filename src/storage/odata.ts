import { isDate, isNullOrEmptyArray, isNullOrEmptyString, isNullOrUndefined, isNumber, isString } from "@kwiz/common";

export enum ODataOperators {
    equal = "eq",
    notEqual = "ne",
    greater = "gt",
    greaterOrEqual = "ge",
    less = "lt",
    lessOrEqual = "le",
    contains = "in",
    startswith = "startswith"
}
export enum ODataJoinOperators {
    and = "and",
    or = "or"
}

export interface IOdataFilter<DataType> {
    property: keyof DataType;
    operator: ODataOperators;
    value: string | Date | number | boolean;
    not?: boolean;
}
export interface IOdataFilterStatement<DataType> {
    filters: (IOdataFilter<DataType> | IOdataFilterStatement<DataType>)[];
    /** default: or */
    join?: ODataJoinOperators;
    not?: boolean;
}
function isIOdataFilter<DataType>(f: IOdataFilter<DataType> | IOdataFilterStatement<DataType>): f is IOdataFilter<DataType> {
    if (typeof (f as IOdataFilter<DataType>).property === "string")
        return true;
    return false;
}
function isIOdataFilterStatement<DataType>(f: IOdataFilter<DataType> | IOdataFilterStatement<DataType>): f is IOdataFilter<DataType> {
    if (typeof (f as IOdataFilterStatement<DataType>).filters === "object" && Array.isArray((f as IOdataFilterStatement<DataType>).filters))
        return true;
    return false;
}

enum TableStorageKnownColumns {
    partitionKey = "PartitionKey",
    rowKey = "RowKey"
}

function getPropNameForFilter(prop: string | number | symbol) {
    return TableStorageKnownColumns[prop] || prop as string;
}

function isInt32(num: number): boolean {
    return num >= -2147483648 && num <= 2147483647 && num < 3;
}

function getOdataFilterStatement<DataType>(filter: IOdataFilter<DataType>) {
    let filterValue = isNullOrUndefined(filter.value)
        ? `null`
        : isString(filter.value)
            ? `'${filter.value.replace(/'/g, "''")}'`
            : isDate(filter.value)
                ? `'${filter.value.toISOString()}'`
                : isNumber(filter.value)
                    ? `${filter.value}${isInt32(filter.value) ? '' : 'L'}`
                    : `${filter.value}`;

    if (filter.operator === ODataOperators.startswith)
        return `${filter.not ? 'not ' : ''}${filter.operator}(${getPropNameForFilter(filter.property)}, ${filterValue})`;
    return `${filter.not ? 'not ' : ''}${getPropNameForFilter(filter.property)} ${filter.operator} ${filterValue}`;
}

export function getOdataFilter<DataType>(statement: IOdataFilterStatement<DataType>) {
    if (isNullOrUndefined(statement) || isNullOrEmptyArray(statement.filters)) return "";
    if (isNullOrEmptyString(statement.join)) statement.join = ODataJoinOperators.or;

    let filterStatements: string[] = [];
    statement.filters.forEach(filter => {
        if (isIOdataFilter(filter)) {
            filterStatements.push(getOdataFilterStatement<DataType>(filter));
        }
        else {
            let subStatement = getOdataFilter(filter);
            if (!isNullOrEmptyString(subStatement))
                filterStatements.push(subStatement);
        }
    });
    if (filterStatements.length === 0) return "";

    let result = "";
    if (filterStatements.length === 1) result = filterStatements[0];
    else if (filterStatements.length > 1) {
        result = `(${filterStatements.join(` ${statement.join} `)})`;
    }

    return `${statement.not ? '(not ' : ''}${result}${statement.not ? ')' : ''}`;
}