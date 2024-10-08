# Build stage with src
FROM oven/bun:1.1 AS builder

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install

COPY . .

RUN bun build --target=bun --outfile=index.js src

# Actual image without unnecessary files
FROM oven/bun:1.1

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/index.js ./

EXPOSE 46982

CMD [ "bun", "index.js" ]

