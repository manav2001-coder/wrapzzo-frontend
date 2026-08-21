# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Vite bakes VITE_* vars in at build time, so the backend URL must be
# supplied as a build ARG, not a runtime env var.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine

# Railway assigns PORT at container start; the official nginx entrypoint
# envsubst's this template into /etc/nginx/conf.d/default.conf on boot.
ENV PORT=8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
