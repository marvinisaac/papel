FROM node:22-alpine

# Install git and certificates for HTTPS remotes.
RUN apk add --no-cache git ca-certificates

USER node
WORKDIR /home/node/app

COPY --chown=node:node package*.json ./
RUN npm install --only=production || true

COPY --chown=node:node . .

CMD ["node", "server.mjs"]

