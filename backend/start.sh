#!/bin/sh
mkdir -p /data /tmp /data/whatsapp-auth
export DATABASE_URL="${DATABASE_URL:-file:/data/los4.db}"
export WHATSAPP_AUTH_FOLDER="${WHATSAPP_AUTH_FOLDER:-/data/whatsapp-auth}"
echo "📦 Starting Reto — DATABASE_URL=$DATABASE_URL PORT=${PORT:-8000}"
npx prisma db push --accept-data-loss 2>&1 || { echo "⚠️ prisma db push failed, trying /tmp"; export DATABASE_URL="file:/tmp/los4.db"; npx prisma db push --accept-data-loss 2>&1; }
node dist/prisma/seed.js 2>&1 || echo "⚠️ seed skipped"
echo "🚀 Launching server..."
exec node dist/index.js
