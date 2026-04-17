# ===== BUILD STAGE =====
FROM node:20-alpine AS build
WORKDIR /app

# Copy đúng lockfile để tận dụng cache tốt nhất
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_APP_BASE_NAME=/react/login
ENV VITE_APP_BASE_NAME=$VITE_APP_BASE_NAME

RUN npm run build

# ===== RUN STAGE =====
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p /usr/share/nginx/html/react/login
COPY --from=build /app/dist /usr/share/nginx/html/react/login

EXPOSE 80
CMD ["nginx","-g","daemon off;"]
