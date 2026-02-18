FROM oven/bun:latest

WORKDIR /app

# Copy workspace configs
COPY package.json bun.lockb* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN bun install

# Copy source
COPY . .

EXPOSE 5173

CMD ["bun", "run", "--cwd", "apps/web", "dev", "--host"]
