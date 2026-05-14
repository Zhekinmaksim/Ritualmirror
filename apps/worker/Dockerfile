FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/worker ./apps/worker

RUN pnpm install --frozen-lockfile
RUN pnpm --filter worker build

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

CMD ["pnpm", "--filter", "worker", "start"]
