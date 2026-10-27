# shipth.at, self-hosted: the app in one container. docker-compose.yml runs it
# beside Postgres. See shipth.at/docs/self-host.
FROM node:22-alpine
RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
# Building needs no real settings; the container gets them when it starts.
RUN BETTER_AUTH_SECRET=build pnpm --filter @shipthat/web build

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/apps/web
# Bring the database up to the schema, then serve.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push && node node_modules/next/dist/bin/next start -p 3000"]
