import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";
import { getAuthenticatedUser, SESSION_COOKIE_NAME } from "../lib/auth.js";
import {
  generateSessionToken,
  hashPassword,
  sha256Hex,
  verifyPassword,
} from "../lib/crypto.js";

const signupSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.trim().toLowerCase()),
  name: z.string().min(1).max(120).trim(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/auth/signup", async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid signup payload", details: parsed.error.flatten() });
    }

    const { email, name, password } = parsed.data;
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return reply.code(409).send({ error: "An account with this email already exists" });
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({ email, name, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name });

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.insert(sessions).values({
      userId: created.id,
      tokenHash: sha256Hex(token),
      expiresAt,
    });

    reply.setCookie(SESSION_COOKIE_NAME, token, cookieOptions());
    return reply.code(201).send({ user: created, token });
  });

  app.post("/v1/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid login payload" });
    }

    const { email, password } = parsed.data;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.insert(sessions).values({
      userId: user.id,
      tokenHash: sha256Hex(token),
      expiresAt,
    });

    reply.setCookie(SESSION_COOKIE_NAME, token, cookieOptions());
    return reply.send({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  });

  app.post("/v1/auth/logout", async (request, reply) => {
    const cookieToken = request.cookies?.[SESSION_COOKIE_NAME];
    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
    const rawToken = cookieToken || bearerToken;

    if (rawToken) {
      await db.delete(sessions).where(eq(sessions.tokenHash, sha256Hex(rawToken)));
    }

    reply.clearCookie(SESSION_COOKIE_NAME, {
      path: "/",
      ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
    });
    return reply.send({ ok: true });
  });

  app.get("/v1/auth/me", async (request, reply) => {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    return reply.send({ user });
  });
}
