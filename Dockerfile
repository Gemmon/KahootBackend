FROM node:22-alpine

WORKDIR /app

COPY . /app

RUN corepack enable && yarn install --immutable && yarn prisma generate && yarn cache clean

VOLUME /app/public

EXPOSE 3000

CMD ["yarn", "dev"]