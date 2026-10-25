// Shapes shared by the server and the client. Dates travel as ISO strings.

export const STATUSES = ["backlog", "todo", "doing", "done"] as const;
export const ALL_STATUSES = ["backlog", "todo", "doing", "done", "canceled"] as const;
export const TYPES = ["bug", "feature", "idea"] as const;

export type Status = (typeof ALL_STATUSES)[number];
export type TaskType = (typeof TYPES)[number];

export const STATUS_NAME: Record<Status, string> = {
  backlog: "Backlog",
  todo: "Todo",
  doing: "Doing",
  done: "Done",
  canceled: "Canceled",
};
export const TYPE_NAME: Record<TaskType, string> = { bug: "Bug", feature: "Feature", idea: "Idea" };

export type Member = {
  id: string;
  kind: "person" | "agent";
  name: string;
  avatarUrl: string | null;
  role: "owner" | "member";
  removed: boolean;
};

export type Project = {
  id: string;
  key: string;
  name: string;
  brief: string;
  deleted: boolean;
};

export type Task = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  notes: string;
  type: TaskType;
  status: Status;
  assigneeId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
};

export type Activity = {
  id: number;
  taskId: string;
  actorId: string;
  kind: "created" | "moved" | "assigned" | "renamed" | "retyped" | "notes" | "commented";
  data: Record<string, unknown> | null;
  body: string | null;
  createdAt: string;
};

export type Me = {
  memberId: string;
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: "owner" | "member";
};

export type Sync = {
  cursor: string;
  members: Member[];
  projects: Project[];
  tasks: Task[];
  activity?: { taskId: string; items: Activity[] };
};

export type Snapshot = Sync & {
  me: Me;
  workspace: { id: string; name: string };
  workspaces: { id: string; name: string }[];
  mcpUrl: string;
};

export type AgentKey = { id: string; memberId: string; hint: string; lastUsedAt: string | null; createdAt: string };
export type Invite = { id: string; token: string; expiresAt: string };
export type SettingsData = { keys: AgentKey[]; invites: Invite[] };
