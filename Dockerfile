FROM node:18-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma ./apps/api/prisma/

RUN npm ci --include-workspace-root --workspace=@zentra/api

FROM base AS build

COPY apps/api ./apps/api

RUN npm run db:generate --workspace=@zentra/api
RUN npm run build --workspace=@zentra/api

FROM base AS production

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]