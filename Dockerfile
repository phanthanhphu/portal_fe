# ===== BUILD STAGE =====
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_APP_VERSION=v2.1.0
ARG VITE_APP_BASE_NAME=/
ARG VITE_API_BASE_URL=http://10.218.20.165:8081

ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_BASE_NAME=$VITE_APP_BASE_NAME
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# ===== RUN STAGE =====
FROM nginx:alpine

ARG NGINX_CONF=nginx.http.conf
ARG APP_PORT=80

COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE ${APP_PORT}

CMD ["nginx", "-g", "daemon off;"]