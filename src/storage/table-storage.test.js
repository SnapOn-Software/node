import assert from 'assert/strict';
import test from 'node:test';
import { IsAzuriteRunning } from "./common";
import { ODataOperators } from "./odata";
import { ConfigureTableStorage, Table, addItem, ensureTable } from "./table-storage";

test('testTableStorage', async t => {
    if (!(await IsAzuriteRunning())) {
        console.log('Skipping table-storage tests - azurite is not running.');
        return;
    }
    //configure storage
    ConfigureTableStorage({ connectionString: "UseDevelopmentStorage=true" });

    const tableName = "TestTable";
    const table = new Table(tableName, {
        getKeys: p => p,
        transform: {
            load: v => ({ ...v, schedule: JSON.parse(v.schedule) }),
            save: v => ({ ...v, schedule: JSON.stringify(v.schedule) })
        }
    });
    const partitionKey = "PK1";
    const partitionKey2 = "PK2";
    const rowKey1 = "0b8612bb-377d-4897-be8f-a532a1ad3e73|d2e32b93-c096-431c-8a79-fcce9a4d7bce";
    const rowKey2 = "0b8612bb-377d-4897-be8f-a532a1ad3e73|cd24aa15-0d03-4892-bb46-af32e5fb9361";
    //start fresh
    let result = await table.delete();
    //don't test this - it might have a table to delete and might not... depending if cleanup didn't work last run
    //await t.test("Delete table", t => assert.strictEqual(result, true));

    //provoke table name not allowed
    result = await ensureTable("T2");
    await t.test("Table name not allowed", t => assert.strictEqual(result, false));

    //create table
    result = await table.ensure();
    await t.test("Create table", t => assert.strictEqual(result, true));

    //provoke table already exists
    result = await table.ensure();
    await t.test("Ensure existing table", t => assert.strictEqual(result, true));

    //add item
    result = await table.addItem({
        partitionKey: partitionKey,
        rowKey: rowKey1,
        list: "1bd32599-375e-4c98-9e1c-ce9dd2f2e17d",
        action: "6b964dd7-6e62-42f6-89e4-5e79d6b6cbb0",
        nextUTC: "2023010105",
        schedule: { days: 4, hours: [1, 2, 3] }
    });
    await t.test("Create item 1", t => assert.strictEqual(result, true));

    result = await table.addItem({
        partitionKey: partitionKey,
        rowKey: rowKey2,
        list: "1bd32599-375e-4c98-9e1c-ce9dd2f2e17d",
        action: "fab4094b-c000-4ff4-bb52-0f8538b2bc49",
        nextUTC: "2023010105",
        schedule: { days: 4, hours: [1, 2, 3] }
    });
    await t.test("Create item 2", t => assert.strictEqual(result, true));

    result = await table.addItem({
        partitionKey: partitionKey2,
        rowKey: rowKey1,
        list: "b98211e2-809a-4761-b928-559eddc28dfc",
        action: "d20196e5-feb9-4202-bd03-718b49bf029e",
        nextUTC: "2023010105",
        schedule: { days: 4, hours: [1, 2, 3] }
    });
    await t.test("Create item in second partition", t => assert.strictEqual(result, true));

    //provoke add second item with same key
    result = await table.addItem({
        partitionKey: partitionKey,
        rowKey: rowKey1,
        list: "1bd32599-375e-4c98-9e1c-ce9dd2f2e17d",
        action: "6b964dd7-6e62-42f6-89e4-5e79d6b6cbb0",
        nextUTC: "2023010105",
        schedule: { days: 4, hours: [1, 2, 3] }
    });
    await t.test("Create item with existing key", t => assert.strictEqual(result, false));

    //provoke add second item with same key
    result = await table.upsertItem({
        partitionKey: partitionKey,
        rowKey: rowKey1,
        list: "1bd32599-375e-4c98-9e1c-ce9dd2f2e17d",
        action: "6b964dd7-6e62-42f6-89e4-5e79d6b6cbb0",
        nextUTC: "2023020202",
        schedule: { days: 4, hours: [1, 2, 3] }
    });
    await t.test("Update item 1", t => assert.strictEqual(result, true));

    //provoke add item to table that does not exist
    result = await addItem(tableName + "DoeNotExist", {
        partitionKey: partitionKey,
        rowKey: rowKey1,
        list: "1bd32599-375e-4c98-9e1c-ce9dd2f2e17d",
        action: "6b964dd7-6e62-42f6-89e4-5e79d6b6cbb0",
        nextUTC: "2023020202",
        schedule: { days: 4, hours: [1, 2, 3] }
    });
    await t.test("Create item in table that does not exist", t => assert.strictEqual(result, false));

    let allItems = await table.getItems();
    await t.test("Get items", t => assert.strictEqual(allItems.length, 3));

    //find items by partition
    let partitionItems = await table.getItems({
        filterStatment: {
            filters: [
                {
                    property: "partitionKey",
                    operator: ODataOperators.equal,
                    value: partitionKey
                }
            ]
        }
    });

    await t.test("Get items with filter", t => assert.strictEqual(partitionItems.length, 2));
    await t.test("Update values", t => assert.strictEqual(partitionItems[1].nextUTC, "2023020202"));

    let deleteResult = await table.deleteItem({ partitionKey: partitionKey, rowKey: rowKey1 });
    await t.test("delete item", t => assert.strictEqual(deleteResult, true));
    deleteResult = await table.deleteItem({ partitionKey: partitionKey, rowKey: rowKey1 });
    await t.test("delete item that was already deleted", t => assert.strictEqual(deleteResult, true));

    //cleanup
    result = await table.delete();
    await t.test("Delete table", t => assert.strictEqual(result, true));
});