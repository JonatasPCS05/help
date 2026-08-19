FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm install --workspaces --if-present --include-workspace-root

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/admin

FROM node:20-alpine AS runner
WORKDIR /repo/apps/admin
ENV NODE_ENV=production
COPY --from=build /repo/apps/admin/.next ./.next
COPY --from=build /repo/apps/admin/public ./public
COPY --from=build /repo/apps/admin/package.json ./package.json
COPY --from=build /repo/apps/admin/next.config.mjs ./next.config.mjs
COPY --from=build /repo/node_modules ../../node_modules

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
