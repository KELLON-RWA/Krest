CREATE TABLE "api_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"method" varchar(16) NOT NULL,
	"route" varchar(512) NOT NULL,
	"status_code" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"consumer_hash" char(64),
	"sdk_name" varchar(64),
	"network" varchar(32),
	"contract_id" varchar(128),
	"rpc_method" varchar(64),
	"error_type" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_salts" (
	"utc_date" varchar(10) PRIMARY KEY NOT NULL,
	"salt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"allowed_origins" text[] DEFAULT '{}' NOT NULL,
	"public_key" varchar(64) NOT NULL,
	"secret_key_hash" char(64) NOT NULL,
	"secret_key_prefix" varchar(20) NOT NULL,
	"share_with_ecosystem" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug"),
	CONSTRAINT "projects_public_key_unique" UNIQUE("public_key"),
	CONSTRAINT "projects_secret_key_hash_unique" UNIQUE("secret_key_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "web_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"visitor_hash" char(64) NOT NULL,
	"session_hash" char(64) NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"event_name" varchar(120),
	"path" varchar(512) NOT NULL,
	"referrer_domain" varchar(255),
	"utm_source" varchar(120),
	"utm_medium" varchar(120),
	"utm_campaign" varchar(120),
	"country" char(2),
	"device_type" varchar(32),
	"browser" varchar(64),
	"os" varchar(64),
	"wallet_name" varchar(64),
	"network" varchar(32),
	"tx_stage" varchar(32),
	"contract_id" varchar(128),
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_events" ADD CONSTRAINT "api_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_events" ADD CONSTRAINT "web_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_events_project_time_idx" ON "api_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "api_events_project_route_idx" ON "api_events" USING btree ("project_id","route");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "web_events_project_time_idx" ON "web_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "web_events_project_type_idx" ON "web_events" USING btree ("project_id","event_type");