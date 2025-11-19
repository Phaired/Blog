FROM oven/bun:1 AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y curl tzdata tar gzip

RUN curl -fsSL https://d2lang.com/install.sh | sh -s --

ENV TZ=Europe/Paris

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN echo "BUILD_DATE=\"$(date '+%Y-%m-%dT%H:%M:00')\"" > .env

RUN bun x astro sync
RUN bun run build

FROM nginx:alpine

RUN apk add --no-cache tzdata
ENV TZ=Europe/Paris

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]