FROM node:22-bookworm-slim AS dependencies
WORKDIR /opt/uuk
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM dependencies AS build
COPY next.config.mjs ./
COPY src/ ./src/
COPY public/ ./public/
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 UUK_DATA_DIR=/data
WORKDIR /opt/uuk
COPY --from=build /opt/uuk/node_modules ./node_modules
COPY --from=build /opt/uuk/.next ./.next
COPY --from=build /opt/uuk/public ./public
COPY --from=build /opt/uuk/src ./src
COPY package.json next.config.mjs server.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 1992 21 8080 53/udp
CMD ["node", "server.mjs"]
