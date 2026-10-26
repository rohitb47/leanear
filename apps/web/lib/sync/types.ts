// Shapes shared by the server and the client. Dates travel as ISO strings.

export const STATUSES = ["backlog", "todo", "doing", "done"] as const
export const ALL_STATUSES = [
  "backlog",
  "todo",
  "doing",
  "done",
  "canceled",
] as const
export const TYPES = ["bug", "feature", "idea"] as const

export type Status = (typeof ALL_STATUSES)[number]
export type TaskType = (typeof TYPES)[number]

export const STATUS_NAME: Record<Status, string> = {
  backlog: "Backlog",
  todo: "Todo",
  doing: "Doing",
  done: "Done",
  canceled: "Canceled",
}
export const TYPE_NAME: Record<TaskType, string> = {
  bug: "Bug",
  feature: "Feature",
  idea: "Idea",
}

export type Member = {
  id: string
  kind: "person" | "agent"
  name: string
  avatarUrl: string | null
  role: "owner" | "member"
  removed: boolean
}

export type Project = {
  id: string
  key: string
  name: string
  deleted: boolean
}

export type Task = {
  id: string
  projectId: string
  number: number
  title: string
  notes: string
  type: TaskType
  status: Status
  assigneeId: string | null
  position: number
  createdAt: string
  updatedAt: string
  deleted: boolean
}

export type Activity = {
  id: number
  taskId: string
  actorId: string
  kind:
    | "created"
    | "moved"
    | "assigned"
    | "renamed"
    | "retyped"
    | "notes"
    | "commented"
  data: Record<string, unknown> | null
  body: string | null
  createdAt: string
}

export type Me = {
  memberId: string
  userId: string
  name: string
  email: string | null
  avatarUrl: string | null
  role: "owner" | "member"
}

export type Sync = {
  cursor: string
  members: Member[]
  projects: Project[]
  tasks: Task[]
  /** What other members just did, newest last, for the live line on the board. */
  recent: Activity[]
  activity?: { taskId: string; items: Activity[] }
}

/** Off on a self-hosted copy. On Cloud, the plan and how full it is. */
export type Billing =
  | { on: false }
  | {
      on: true
      active: boolean
      status: string | null
      paidUntil: string | null
      cancelsAtEnd: boolean
      cents: number
      limits: { projects: number; people: number; agents: number }
      usage: { projects: number; people: number; agents: number }
    }

export type Snapshot = Sync & {
  me: Me
  workspace: { id: string; name: string }
  workspaces: { id: string; name: string }[]
  mcpUrl: string
  billing: Billing
  /** God mode: `next dev` on a local database only. */
  god: boolean
}

export type AgentKey = {
  id: string
  memberId: string
  hint: string
  lastUsedAt: string | null
  createdAt: string
}
export type Invite = { id: string; token: string; expiresAt: string }
export type SettingsData = { keys: AgentKey[]; invites: Invite[] }

/** A line in the workspace's history: who, what, when, in a frozen sentence. */
export type LogEntry = {
  id: number
  actorId: string | null
  actorName: string
  action: string
  kind: "task" | "project" | "member" | "workspace"
  subjectId: string | null
  label: string
  projectId: string | null
  summary: string
  createdAt: string
}

/** Something deleted, still restorable. */
export type TrashItem = {
  kind: "task" | "project"
  id: string
  label: string
  title: string
  projectKey: string | null
  deletedAt: string
  deletedBy: string | null
}
