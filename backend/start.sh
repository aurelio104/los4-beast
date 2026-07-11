#!/bin/sh
mkdir -p /data /tmp
export DATABASE_URL="${DATABASE_URL:-file:/data/los4.db}"
echo "📦 Starting LOS 4 — DATABASE_URL=$DATABASE_URL PORT=${PORT:-8000}"
npx prisma db push 2>&1 || { echo "⚠️ prisma db push failed, trying /tmp"; export DATABASE_URL="file:/tmp/los4.db"; npx prisma db push 2>&1; }
node dist/prisma/seed.js 2>&1 || echo "⚠️ seed skipped"
echo "🚀 Launching server..."
exec node dist/index.js
