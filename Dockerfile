# Leanear app (apps/web) for self-hosting. Migrations run on start.
FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @leanear/web exec next build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @leanear/web db:migrate && pnpm --filter @leanear/web start"]
