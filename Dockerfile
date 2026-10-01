# syntax=docker/dockerfile:1
#
# mcporter as a build toolchain image: Node 24 + Bun + this checkout of mcporter
# installed globally. Consumers use it as a build stage to turn an MCP server
# into a standalone CLI, e.g.
#
#   FROM ghcr.io/hellobasis/mcporter:aria AS cli-build
#   COPY --from=<server image> /opt/server /opt/server
#   RUN mcporter generate-cli --command "node /opt/server/dist/index.js" --compile /opt/server/bin/cli
#
# Bun is included because `generate-cli --compile` needs it; it is copied from
# Bun's official image so no postinstall download runs.

FROM node:24-bookworm-slim AS build
RUN corepack enable
WORKDIR /src
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build && pnpm pack && mv mcporter-*.tgz /mcporter.tgz

FROM node:24-bookworm-slim
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
COPY --from=build /mcporter.tgz /tmp/mcporter.tgz
RUN npm install -g /tmp/mcporter.tgz && rm /tmp/mcporter.tgz && mcporter --version
WORKDIR /work
