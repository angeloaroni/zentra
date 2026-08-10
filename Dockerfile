FROM node:18-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN npm ci --include-workspace-root --workspace=@zentra/api

COPY apps/api/prisma ./apps/api/prisma/

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

FROM base AS build

COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/nest-cli.json ./apps/api/nest-cli.json

RUN npm run build --workspace=@zentra/api

FROM node:18-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/prisma ./apps/api/prisma
COPY --from=base /app/apps/api/package.json ./apps/api/package.json
COPY --from=base /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3001

# Railway deploy
CMD ["sh", "-c", "npx prisma db push --schema=apps/api/prisma/schema.prisma --skip-generate && node apps/api/dist/main"]