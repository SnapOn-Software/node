import assert from 'assert/strict';
import test from 'node:test';
import { DiscoverTenantInfo } from "./discovery";

test('DiscoverTenantInfo', async t => {
    const tenantName = "kwizcom.com";
    const tenantInfo = await DiscoverTenantInfo(tenantName);
    assert.strictEqual(tenantInfo.idOrName, "7d034656-be03-457d-8d82-60e90cf5f400");
});