import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { CommonConfig, CommonLogger, GetError, isNullOrEmptyString, promiseOnce, shiftDate, shiftDateValues } from "@kwiz/common";
import forge from "node-forge";

var logger: CommonLogger;
var keyVaultUrl: string = null;
var bias: number;
/** provide the URL for azure key vault
 * to use from an Azure App Service - grant access to "Microsoft Azure App Service" for "Key Vault Certificate User" and "Key Vault Secrets User" roles
 * For local dev session, grant access to [your app registration name], and add these environment variables:
 * AZURE_TENANT_ID - your tenant ID
 * AZURE_CLIENT_ID - your azure app registration id
 * AZURE_CLIENT_SECRET - your azure app secret
 */
export function ConfigureKeyVault(config: {
    url: string;
}) {
    keyVaultUrl = config.url;
    bias = CommonConfig.i.IsLocalDev ? shiftDateValues.m10 : shiftDateValues.h24;
    logger = new CommonLogger("key-vault");
    logger.log(`Configured for ${config.url}, bias: ${CommonConfig.i.IsLocalDev ? '10 minutes' : '24 hours'}`);
}

type tCertificate = {
    privateKey: string;
    certificate: string;
    thumbprint: string;
    fetched: number;
};
/**
 * Fetches the active certificate from Azure Key Vault.
 * It loads the last 2 certificates, uses the old one as long as it is not expired, once it is expired - switches to using the newer one.
 * by default it caches the result and reuses it, forceRefresh to bypass
 */
export async function getLatestCertificate(certName: string, forceRefresh = false): Promise<tCertificate> {
    try {
        if (isNullOrEmptyString(keyVaultUrl)) {
            console.error("Call ConfigureKeyVault first!");
            throw Error("Call ConfigureKeyVault first!");
        }

        const res = await promiseOnce<tCertificate>(`getLatestCertificate(${certName})`, async () => {
            logger.log(`Fetching ${certName}`);
            const vaultUrl = keyVaultUrl;

            if (!vaultUrl) {
                throw new Error("Missing AZURE_KEYVAULT_URL environment variable.");
            }

            try {
                // DefaultAzureCredential - in azure: automatically discovers your App Service's Managed Identity
                // In local dev: add AZURE_TENANT_ID,AZURE_CLIENT_ID,AZURE_CLIENT_SECRET to your env file
                const credential = new DefaultAzureCredential();
                const client = new SecretClient(vaultUrl, credential);

                // List all versions of the secret
                const versionProperties: any[] = [];
                for await (const prop of client.listPropertiesOfSecretVersions(certName)) {
                    // Only consider enabled versions
                    if (prop.enabled) {
                        versionProperties.push(prop);
                    }
                    //do not rely on prop.expiresOn - manually uploaded certificates might input wrong/missing date here!
                }
                if (versionProperties.length === 0) {
                    throw new Error(`No enabled versions found for secret '${certName}'.`);
                }
                // Sort them by creation date to get the newest ones first
                versionProperties.sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime());

                //most recent certificate
                const latestSecret = await client.getSecret(certName, { version: versionProperties[0].version });
                const latestCreds = splitPfxToPemStrings(latestSecret.value!);
                if (versionProperties.length === 1)//only 1 - return it
                    return { ...latestCreds, fetched: new Date().getTime() };

                //previous certificate
                const previousSecret = await client.getSecret(certName, { version: versionProperties[1].version });
                const previousCreds = splitPfxToPemStrings(previousSecret.value!);

                const creds = stillValid(previousCreds.certificate, true) ? previousCreds : latestCreds;
                return { ...creds, fetched: new Date().getTime() };
            } catch (error) {
                logger.error(`Failed to fetch certificate [${certName}] from Key Vault: ${GetError(error)}`);
                throw error;
            }
        }, async res => {
            if (forceRefresh) return false;//never valid... get a new one.

            if (res?.fetched > 0) {
                const valid = shiftDate("h24", new Date(res.fetched)).getTime() > new Date().getTime();
                if (!valid) logger.log(`${certName} too stale`);
                return valid;
            }
            return false;
        });

        return res;
    } catch (e) {
        return null;
    }
}

/** withBias :
 * The certificate is valid only if:
 *  - It started at least 1 day before today (oneDayAgo >= notBefore)
 *  - There is at least 1 more day before it expires (oneDayFromNow <= notAfter)
 *  */
function stillValid(certificate: string, withBias = false) {
    const prevCertObj = forge.pki.certificateFromPem(certificate);
    const now = new Date();
    const notAfter = withBias ? shiftDate(bias) : now;
    const notBefore = withBias ? shiftDate(bias * -1) : now;

    const isStillValid = notBefore >= prevCertObj.validity.notBefore &&
        notAfter <= prevCertObj.validity.notAfter;

    return isStillValid;
}

function splitPfxToPemStrings(fullPemString: string) {
    try {
        // 1. Extract the Private Key using regex
        const privateKeyMatch = fullPemString.match(/-----BEGIN [\s\S]+?-----END [\s\S]+?KEY-----/);
        const privateKey = privateKeyMatch ? privateKeyMatch[0] : null;

        // 2. Extract the Public Certificate using regex
        const certificateMatch = fullPemString.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
        const certificate = certificateMatch ? certificateMatch[0] : null;

        if (!privateKey || !certificate) {
            throw new Error("The retrieved secret did not contain a valid private key and certificate pair.");
        }

        // ==========================================
        // ⚡ COMPUTE THE THUMBPRINT (Required for MSAL)
        // ==========================================
        // MSAL needs the unique SHA-1 thumbprint of the public certificate
        const cert = forge.pki.certificateFromPem(certificate);
        const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
        const thumbprint = forge.md.sha1.create().update(der).digest().toHex().toUpperCase();

        return {
            privateKey,
            certificate,
            thumbprint
        };

    } catch (error: any) {
        logger.error("Failed to split PFX archive: " + GetError(error));
        throw error;
    }
}