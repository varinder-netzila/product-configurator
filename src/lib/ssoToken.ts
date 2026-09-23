import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.SSO_JWT_SECRET!
);

export async function createSsoToken(
  customerId: string,
  shop: string
) {
  return await new SignJWT({
    customerId,
    shop,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(secret);
}

export async function verifySsoToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return payload;
  } catch (error) {
    console.error("🔥 JWT VERIFY FAILED:");
    console.error(
      "🔥 ERROR:",
      error instanceof Error ? error.message : String(error)
    );

    return null;
  }
}