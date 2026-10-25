import { sql } from "drizzle-orm";
import {
  bigserial,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => Buffer.from(v),
});

const at = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const now = (name: string) => at(name).notNull().defaultNow();

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  githubId: text("github_id").unique(),
  googleId: text("google_id").unique(),
  createdAt: now("created_at"),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id"),
  expiresAt: at("expires_at").notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: now("created_at"),
});

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["person", "agent"] }).notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
    removedAt: at("removed_at"),
    updatedAt: now("updated_at"),
  },
  (t) => [index("members_ws").on(t.workspaceId, t.updatedAt), index("members_user").on(t.userId)],
);

export const agentKeys = pgTable("agent_keys", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  hash: text("hash").notNull().unique(),
  hint: text("hint").notNull(),
  lastUsedAt: at("last_used_at"),
  revokedAt: at("revoked_at"),
  createdAt: now("created_at"),
});

export const invites = pgTable("invites", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdBy: text("created_by").notNull(),
  expiresAt: at("expires_at").notNull(),
  revokedAt: at("revoked_at"),
});

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    brief: text("brief").notNull().default(""),
    seq: integer("seq").notNull().default(0),
    createdAt: now("created_at"),
    updatedAt: now("updated_at"),
    deletedAt: at("deleted_at"),
  },
  (t) => [
    uniqueIndex("projects_ws_key").on(t.workspaceId, t.key).where(sql`deleted_at is null`),
    index("projects_ws").on(t.workspaceId, t.updatedAt),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    type: text("type", { enum: ["bug", "feature", "idea"] }).notNull().default("feature"),
    status: text("status", { enum: ["backlog", "todo", "doing", "done", "canceled"] }).notNull().default("todo"),
    assigneeId: text("assignee_id").references(() => members.id, { onDelete: "set null" }),
    position: doublePrecision("position").notNull().default(0),
    createdBy: text("created_by").notNull(),
    createdAt: now("created_at"),
    updatedAt: now("updated_at"),
    deletedAt: at("deleted_at"),
  },
  (t) => [
    uniqueIndex("tasks_project_number").on(t.projectId, t.number),
    index("tasks_ws").on(t.workspaceId, t.updatedAt),
    index("tasks_col").on(t.projectId, t.status, t.position),
  ],
);

export const activity = pgTable(
  "activity",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    kind: text("kind").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    body: text("body"),
    createdAt: now("created_at"),
  },
  (t) => [index("activity_task").on(t.taskId, t.id)],
);

export const images = pgTable("images", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  taskId: text("task_id"),
  mime: text("mime").notNull(),
  bytes: bytea("bytes").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: now("created_at"),
});
