import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  bigserial,
  integer,
  jsonb,
  char,
  varchar,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    allowedOrigins: text("allowed_origins").array().notNull().default([]),
    publicKey: varchar("public_key", { length: 64 }).notNull().unique(),
    secretKeyHash: char("secret_key_hash", { length: 64 }).notNull().unique(),
    secretKeyPrefix: varchar("secret_key_prefix", { length: 20 }).notNull(),
    shareWithEcosystem: boolean("share_with_ecosystem").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("projects_user_idx").on(table.userId)]
);

export const dailySalts = pgTable("daily_salts", {
  utcDate: varchar("utc_date", { length: 10 }).primaryKey(),
  salt: text("salt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const webEvents = pgTable(
  "web_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    visitorHash: char("visitor_hash", { length: 64 }).notNull(),
    sessionHash: char("session_hash", { length: 64 }).notNull(),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    eventName: varchar("event_name", { length: 120 }),
    path: varchar("path", { length: 512 }).notNull(),
    referrerDomain: varchar("referrer_domain", { length: 255 }),
    utmSource: varchar("utm_source", { length: 120 }),
    utmMedium: varchar("utm_medium", { length: 120 }),
    utmCampaign: varchar("utm_campaign", { length: 120 }),
    country: char("country", { length: 2 }),
    deviceType: varchar("device_type", { length: 32 }),
    browser: varchar("browser", { length: 64 }),
    os: varchar("os", { length: 64 }),
    walletName: varchar("wallet_name", { length: 64 }),
    network: varchar("network", { length: 32 }),
    txStage: varchar("tx_stage", { length: 32 }),
    contractId: varchar("contract_id", { length: 128 }),
    properties: jsonb("properties").$type<Record<string, string | number | boolean>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("web_events_project_time_idx").on(table.projectId, table.createdAt),
    index("web_events_project_type_idx").on(table.projectId, table.eventType),
  ]
);

export const apiEvents = pgTable(
  "api_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 16 }).notNull(),
    route: varchar("route", { length: 512 }).notNull(),
    statusCode: integer("status_code").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    consumerHash: char("consumer_hash", { length: 64 }),
    sdkName: varchar("sdk_name", { length: 64 }),
    network: varchar("network", { length: 32 }),
    contractId: varchar("contract_id", { length: 128 }),
    rpcMethod: varchar("rpc_method", { length: 64 }),
    errorType: varchar("error_type", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("api_events_project_time_idx").on(table.projectId, table.createdAt),
    index("api_events_project_route_idx").on(table.projectId, table.route),
  ]
);
