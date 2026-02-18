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

EXPOSE 3000

# We use the root as WORKDIR and run with --cwd
CMD ["bun", "run", "--cwd", "apps/api", "dev"]
