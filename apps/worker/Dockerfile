FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS dev
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY . .

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @lov2/api prisma:generate && pnpm --filter @lov2/worker build

FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/apps/worker/dist ./dist
COPY --from=build /workspace/node_modules ./node_modules
CMD ["node", "dist/apps/worker/src/main.js"]
