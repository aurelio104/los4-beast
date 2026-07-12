#!/bin/sh
mkdir -p /data/uploads /data/whatsapp-auth /data/uploads/radio

export DATABASE_URL="${DATABASE_URL:-file:/data/los4.db}"
export UPLOAD_DIR="${UPLOAD_DIR:-/data/uploads}"
export WHATSAPP_AUTH_FOLDER="${WHATSAPP_AUTH_FOLDER:-/data/whatsapp-auth}"

echo "📦 Starting Reto — DATABASE_URL=$DATABASE_URL"
echo "   UPLOAD_DIR=$UPLOAD_DIR"
echo "   WHATSAPP_AUTH_FOLDER=$WHATSAPP_AUTH_FOLDER"
echo "   PORT=${PORT:-8000}"

if [ -f /opt/bgutil-pot/server/build/main.js ]; then
  node /opt/bgutil-pot/server/build/main.js --port 4416 >/tmp/bgutil-pot.log 2>&1 &
  echo "🎬 YouTube POT provider en :4416 (pid $!)"
fi

if mount | grep -q ' on /data '; then
  echo "💾 Volumen persistente montado en /data"
elif [ -d /data ] && [ -w /data ]; then
  echo "💾 /data escribible (volumen o disco local)"
else
  echo "⚠️  /data no montado — en Koyeb debe existir volumen los4-data-fra:/data"
fi

if [ -f /data/los4.db ]; then
  echo "💾 Base de datos existente en volumen"
else
  echo "💾 Base de datos nueva — se creará en /data/los4.db"
fi

if [ -d /data/uploads ] && [ "$(ls -A /data/uploads 2>/dev/null)" ]; then
  echo "🖼️  Fotos de perfil en volumen: $(ls /data/uploads 2>/dev/null | wc -l | tr -d ' ') archivos"
fi

if [ -d /data/whatsapp-auth ]; then
  wa_count=$(find /data/whatsapp-auth -maxdepth 1 -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$wa_count" != "0" ]; then
    echo "📱 Archivos WhatsApp auth en volumen: $wa_count"
  fi
fi

if ! npx prisma db push --accept-data-loss 2>&1; then
  if [ "$NODE_ENV" = "production" ]; then
    echo "❌ prisma db push falló en producción — verifica volumen /data"
    exit 1
  fi
  echo "⚠️ prisma db push failed, fallback local /tmp"
  export DATABASE_URL="file:/tmp/los4.db"
  npx prisma db push --accept-data-loss 2>&1
fi

node dist/prisma/seed.js 2>&1 || echo "⚠️ seed skipped"
echo "🚀 Launching server..."
exec node dist/index.js
