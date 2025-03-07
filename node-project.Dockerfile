# A generic build for node projects that
# 1. Install dependencies via npm ci
# 2. Use esbuild to compile/transpile down to Javascript
# 3. Run via an index.js file

FROM node:lts-alpine as build

ARG PROJECT

# Dependencies required to run npm install & healthchecks
RUN apk update
RUN apk --no-cache add python3 make g++ libc6-compat postgresql-dev
WORKDIR /build
# Run dependency install
COPY ["package.json", "package-lock.json", "./"]
RUN npm ci
# Build project
COPY . .
RUN PROJECT=${PROJECT} npm run build

# Run built index.js in production mode
FROM node:lts-alpine as runner
ARG SHA
ENV SHA=${SHA:-000000}
# Just a health-check nice-ity; add curl to the runtime image
RUN apk update
RUN apk --no-cache add curl
WORKDIR /app
COPY --from=build /build/dist ./
ENV NODE_ENV=production
ENV PROJECT=$PROJECT
CMD ["sh", "-c", "node index.js"]
