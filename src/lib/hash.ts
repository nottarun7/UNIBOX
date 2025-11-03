import { compare, hash } from "bcryptjs";

export async function hashPassword(plain: string) {
  return hash(plain, 10);
}

export async function verifyPassword(plain: string, hashed?: string | null) {
  if (!hashed) return false;
  return compare(plain, hashed);
}
