FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/prisma/package.json packages/prisma/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm install --workspaces --if-present --include-workspace-root

FROM deps AS build
COPY . .
RUN npm run build --workspace=packages/shared-types
RUN npm run generate --workspace=packages/prisma
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json

EXPOSE 3333
CMD ["node", "apps/api/dist/server.js"]
