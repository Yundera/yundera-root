FROM node:lts AS base

# install docker https://docs.docker.com/engine/install/ubuntu/
RUN curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
#same version as the one in package.json
RUN corepack prepare pnpm@9.9.0 --activate

WORKDIR /app
COPY package.json /app
COPY pnpm-lock.yaml /app
COPY .npmrc /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . /app
RUN pnpm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY ./template /app/template
EXPOSE 8194
CMD [ "node", "/app/dist" ]