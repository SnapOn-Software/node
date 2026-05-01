import { sign as clientSign, unsign as clientUnsign, newGuid } from '@kwiz/common';
import assert from 'assert/strict';
import test from 'node:test';
import '../helpers/setup-webcrypto.test';
import { sign, unsign } from "./crypto";

test('sign', async t => {
    const password = "1@EWEDF$E%GRE%G" + newGuid();

    const signedClient =  clientSign(password, { "name": "test user 1" });
    const restored = await unsign(password, signedClient);

    const signed = await sign(password, { "name": "test user 1" });
    const restoredClient =  clientUnsign(password, signed);


    await t.test('test sign in client', () => assert.strictEqual(restored.name, "test user 1"));

    await t.test('test sign in node', () => assert.strictEqual(restoredClient.name, "test user 1"));
});
