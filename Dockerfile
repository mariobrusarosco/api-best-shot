FROM node:22-slim AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY tsconfig.json ./
COPY src ./src

RUN pnpm run build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["pnpm", "run", "start"]
