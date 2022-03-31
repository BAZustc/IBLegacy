FROM node:16-alpine AS builder

ARG NEXT_PUBLIC_TESTNET_GRAPHQL_URL

ENV NEXT_PUBLIC_TESTNET_GRAPHQL_URL ${NEXT_PUBLIC_TESTNET_GRAPHQL_URL}

RUN apk add --no-cache libc6-compat python3 make gcc musl-dev g++

# Mitigate CVEs
RUN apk add --no-cache 'libretls>=3.3.4-r3' 'libcrypto1.1>=1.1.1n-r0' 'libssl1.1>=1.1.1n-r0' 'zlib>=1.2.12-r0'

WORKDIR /app

COPY . .

RUN npm ci && \
    # https://github.com/vercel/next.js/issues/30713
    rm -r node_modules/@next/swc-linux-x64-gnu

RUN npm run build && \
    npm install --production --ignore-scripts --prefer-offline

FROM node:16-alpine

WORKDIR /app

ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN apk add --no-cache curl

COPY .docker/cache.sh /cloudflare/cache.sh
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV NEXT_TELEMETRY_DISABLED 1

CMD ["npm", "start"]
