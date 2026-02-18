FROM oven/bun:latest

WORKDIR /app

# Copy all workspace definitions
COPY package.json bun.lockb* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/shared-schema/package.json ./libs/shared-schema/

# Install dependencies for the whole workspace
RUN bun install

# Copy source code (including libs)
COPY . .

EXPOSE 5173

CMD ["bun", "run", "--cwd", "apps/web", "dev", "--host"]
