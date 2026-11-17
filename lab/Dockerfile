FROM node:22-bookworm-slim
WORKDIR /opt/lab
COPY --chown=node:node worker.mjs ./worker.mjs
USER node
EXPOSE 9000
CMD ["node", "worker.mjs"]
