FROM node:21-alpine as build
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk update && apk upgrade
#     apk add --no-cache bash git openssh
RUN npm install
COPY . ./

FROM node:21-alpine as production
WORKDIR /app
RUN adduser -u 82 -D -S -G www-data www-data
COPY --from=build --chown=www-data:www-data /app ./
USER www-data
ENV NODE_ENV production

CMD ["npm", "run", "serve"]
