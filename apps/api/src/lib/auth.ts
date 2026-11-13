import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";
import { sha256Hex } from "./crypto.js";

export const SESSION_COOKIE_NAME = "krest_session";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export async function getAuthenticatedUser(
  request: FastifyRequest
): Promise<AuthenticatedUser | null> {
  const cookieToken = request.cookies?.[SESSION_COOKIE_NAME];
  const authHeader = request.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
  const rawToken = cookieToken || bearerToken;

  if (!rawToken) return null;

  const tokenHash = sha256Hex(rawToken);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    await reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  return user;
}
