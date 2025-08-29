# Stage 1: Build React app
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

# Pass build-time ARG to Vite
ARG VITE_HOST_IP
ENV VITE_HOST_IP=$VITE_HOST_IP

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx configuration for SPA (React routing)
RUN rm /etc/nginx/conf.d/default.conf
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
