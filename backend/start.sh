#!/bin/sh
set -e
mkdir -p /data
export DATABASE_URL="${DATABASE_URL:-file:/data/los4.db}"
echo "📦 DB: $DATABASE_URL"
npx prisma db push
node dist/prisma/seed.js || true
exec node dist/index.js
