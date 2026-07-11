FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl ffmpeg python3 py3-pip \
  && pip3 install --break-system-packages yt-dlp \
  && yt-dlp --version
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY start.sh ./start.sh
RUN chmod +x start.sh

ENV NODE_ENV=production
EXPOSE 8000
CMD ["./start.sh"]
