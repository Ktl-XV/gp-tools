FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g corepack

COPY package.json yarn.lock ./
RUN yarn install

COPY packages/lib packages/lib
RUN yarn install

COPY packages/runner packages/runner
RUN yarn install

RUN yarn build:runner

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/packages/runner/dist/queue.js /app/packages/runner/dist/execute.js .
COPY packages/runner/entrypoint.sh .
ENTRYPOINT ["/app/entrypoint.sh"]
