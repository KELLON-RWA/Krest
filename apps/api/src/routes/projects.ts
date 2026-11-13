import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { projects } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";
import { generateProjectKeys } from "../lib/crypto.js";

const createProjectSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  allowedOrigins: z.array(z.string().url().max(255)).max(20).optional().default([]),
  shareWithEcosystem: z.boolean().optional().default(false),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  allowedOrigins: z.array(z.string().url().max(255)).max(20).optional(),
  shareWithEcosystem: z.boolean().optional(),
});

const idSchema = z.string().uuid("Invalid project id");

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "project"}-${suffix}`;
}

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/projects", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) return;

    const list = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        allowedOrigins: projects.allowedOrigins,
        publicKey: projects.publicKey,
        secretKeyPrefix: projects.secretKeyPrefix,
        shareWithEcosystem: projects.shareWithEcosystem,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.createdAt));

    return reply.send({ projects: list });
  });

  app.post("/v1/projects", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) return;

    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid project payload", details: parsed.error.flatten() });
    }

    const keys = generateProjectKeys();
    const [created] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name: parsed.data.name,
        slug: toSlug(parsed.data.name),
        allowedOrigins: parsed.data.allowedOrigins,
        publicKey: keys.publicKey,
        secretKeyHash: keys.secretKeyHash,
        secretKeyPrefix: keys.secretKeyPrefix,
        shareWithEcosystem: parsed.data.shareWithEcosystem,
      })
      .returning({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        allowedOrigins: projects.allowedOrigins,
        publicKey: projects.publicKey,
        secretKeyPrefix: projects.secretKeyPrefix,
        shareWithEcosystem: projects.shareWithEcosystem,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      });

    return reply.code(201).send({
      project: created,
      // Secret key is returned only once on creation or rotation
      secretKey: keys.secretKey,
    });
  });

  app.get("/v1/projects/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) return;

    const { id } = request.params as { id: string };
    if (!idSchema.safeParse(id).success) {
      return reply.code(400).send({ error: "Invalid project id" });
    }
    const [project] = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        allowedOrigins: projects.allowedOrigins,
        publicKey: projects.publicKey,
        secretKeyPrefix: projects.secretKeyPrefix,
        shareWithEcosystem: projects.shareWithEcosystem,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }
    return reply.send({ project });
  });

  app.patch("/v1/projects/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) return;

    const { id } = request.params as { id: string };
    if (!idSchema.safeParse(id).success) {
      return reply.code(400).send({ error: "Invalid project id" });
    }
    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid update payload", details: parsed.error.flatten() });
    }

    const [updated] = await db
      .update(projects)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .returning({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        allowedOrigins: projects.allowedOrigins,
        publicKey: projects.publicKey,
        secretKeyPrefix: projects.secretKeyPrefix,
        shareWithEcosystem: projects.shareWithEcosystem,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      });

    if (!updated) {
      return reply.code(404).send({ error: "Project not found" });
    }
    return reply.send({ project: updated });
  });

  app.post("/v1/projects/:id/rotate-keys", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) return;

    const { id } = request.params as { id: string };
    if (!idSchema.safeParse(id).success) {
      return reply.code(400).send({ error: "Invalid project id" });
    }
    const keys = generateProjectKeys();

    const [updated] = await db
      .update(projects)
      .set({
        publicKey: keys.publicKey,
        secretKeyHash: keys.secretKeyHash,
        secretKeyPrefix: keys.secretKeyPrefix,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .returning({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        allowedOrigins: projects.allowedOrigins,
        publicKey: projects.publicKey,
        secretKeyPrefix: projects.secretKeyPrefix,
        shareWithEcosystem: projects.shareWithEcosystem,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      });

    if (!updated) {
      return reply.code(404).send({ error: "Project not found" });
    }
    return reply.send({ project: updated, secretKey: keys.secretKey });
  });

  app.delete("/v1/projects/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) return;

    const { id } = request.params as { id: string };
    if (!idSchema.safeParse(id).success) {
      return reply.code(400).send({ error: "Invalid project id" });
    }
    const deleted = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .returning({ id: projects.id });

    if (deleted.length === 0) {
      return reply.code(404).send({ error: "Project not found" });
    }
    return reply.send({ ok: true });
  });
}
