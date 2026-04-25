import * as jose from 'jose';

const secret = new TextEncoder().encode(
  process.env.NEXT_PUBLIC_JWT_SECRET || 'cables-on-ground-secret-key-12h'
);

export async function generateJWT(phoneNumber: string): Promise<string> {
  const token = await new jose.SignJWT({ phoneNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(secret);
  return token;
}

export async function validateJWT(token: string): Promise<string | null> {
  try {
    const verified = await jose.jwtVerify(token, secret);
    return verified.payload.phoneNumber as string;
  } catch {
    return null;
  }
}

export function getJWTKey(phoneNumber: string): string {
  return `initiated-jwt-${phoneNumber}`;
}
