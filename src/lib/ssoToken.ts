import { jwtVerify } from "jose";

export async function verifySsoToken(token: string) {
  const secret = new TextEncoder().encode(
    process.env.SSO_JWT_SECRET
  );

  const { payload } = await jwtVerify(token, secret);

  return payload;
}