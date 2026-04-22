FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS dev
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/game-data/package.json packages/game-data/package.json
COPY packages/art-pipeline/package.json packages/art-pipeline/package.json
RUN pnpm install --frozen-lockfile
COPY . .

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @lov2/web build

FROM nginx:1.27-alpine AS prod
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
