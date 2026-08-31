# Stage 1: Install dependencies and build the frontend
FROM oven/bun:1 as build

WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code and build the frontend
COPY . .
RUN bun run build

# Stage 2: Create the final production image
FROM oven/bun:1-slim as production

WORKDIR /usr/src/app

# Copy only the necessary artifacts from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/server ./server
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/bun.lockb ./bun.lockb
COPY --from=build /usr/src/app/tsconfig.json ./tsconfig.json
COPY --from=build /usr/src/app/node_modules ./node_modules

EXPOSE 3002

# Set the command to start the server
CMD ["bun", "run", "start"]
