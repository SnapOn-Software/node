import { IDictionary, isNullOrUndefined, isNumber, promiseCatch } from "@kwiz/common";
import { jwtVerify, SignJWT } from "jose";

/** node implementation of the @kwiz/common sign/unsign for Node environments */
export async function sign<T extends IDictionary<string | number | boolean | string[]>>(jwtSecret: string, payload: T, options?: { exp?: number | string | Date; }) {
    const secret = new TextEncoder().encode(jwtSecret);

    const accessToken = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })                   // 1. Set algorithm
        .setIssuedAt()                                          // 2. Add 'iat' claim
        .setExpirationTime(!isNullOrUndefined(options?.exp)
            ? options.exp
            : isNumber(payload.exp)
                ? payload.exp
                : '1h')                                         // 3. Add 'exp' claim (e.g., 5 minutes), or number in seconds
        .sign(secret);                                          // 4. Sign with secret

    return accessToken;
}

export async function unsign<T>(jwtSecret: string, token: string) {
    const secret = new TextEncoder().encode(jwtSecret);
    const result: T = await promiseCatch(async () => {
        const { payload } = await jwtVerify<T>(token, secret, {
            algorithms: ['HS256'],
        });

        return payload;
    });

    return result;
}