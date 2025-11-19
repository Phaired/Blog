FROM terrastruct/d2:latest AS d2-source

FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=d2-source /usr/local/bin/d2 /usr/local/bin/d2
RUN apt-get update && apt-get install -y tzdata

ENV TZ=Europe/Paris

COPY package.json bun.lock* ./

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