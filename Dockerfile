# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# The app calls its own address (/api/...) and nginx forwards that to the backend (see nginx.conf.template), so the
# browser never contacts the backend's own host. Deliberately NOT a build ARG: a leftover VITE_API_BASE_URL variable on
# the host would otherwise put the backend's address back into the bundle.
ENV VITE_API_BASE_URL=""

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine

# Railway assigns PORT at container start; the official nginx entrypoint
# envsubst's this template into /etc/nginx/conf.d/default.conf on boot.
ENV PORT=8080
# Where /api/ is forwarded, and the DNS server nginx asks to find it. To use Railway's private network instead:
#   API_UPSTREAM=http://wrappzo-backend.railway.internal:8080   DNS_RESOLVER=[fd12::10]
ENV API_UPSTREAM=https://wrappzo-backend-production.up.railway.app
ENV DNS_RESOLVER=1.1.1.1
# Where /storage/ is forwarded: the bucket's S3 endpoint (the backend's S3_ENDPOINT), without the bucket name.
ENV STORAGE_UPSTREAM=https://d5688d06f65308ddd6191d6b89f10ea1.r2.cloudflarestorage.com
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker/16-api-upstream.envsh /docker-entrypoint.d/16-api-upstream.envsh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
