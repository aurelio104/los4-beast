# Reto PWA

PWA interactiva para el reto del **29 de agosto de 2026**.

## Arrancar en local

```bash
cd /Volumes/AurelioM2/Aurelio/los4
npm install
npm run db:push && npm run db:seed
npm run dev
```

- **Frontend:** http://localhost:3011
- **Backend:** http://localhost:3010

## Credenciales admin

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `Admin123!` |

## Invitar integrantes

El registro **solo** funciona con un link personal generado por un miembro:

1. Entra al Hub o Perfil
2. Pulsa **Invitar amigo**
3. Comparte el link (un solo uso, válido 14 días)

El admin también puede generar links desde el panel Admin.

## Push notifications (producción)

```bash
cd backend && npm run vapid:generate
```

Copia las claves a `backend/.env` y reinicia el backend.

---

## Funcionalidades completas

### Core
- Contador al 29 ago · video playa · glass UI · confetti y sonidos
- Passkey + login · registro por link
- **12 acciones sociales** con modal informativo en cada botón
- **8 mini-juegos** en Arena (trivia dinámica del grupo)
- Tienda · Cofre · Confesiones · Eventos · **Gran Final** (`/finale`)
- Panel admin completo

### Next-gen (nuevo)
| Feature | Detalle |
|---------|---------|
| **Tiempo real** | Feed + ranking se actualizan cada 30s |
| **Votación visible** | Barras de votos del ciclo en el Hub |
| **Alianza visible** | Muestra tu aliado en Hub y Perfil |
| **Racha diaria** | Contador 🔥 de días consecutivos |
| **Badges dinámicos** | Botones con alertas (continuar, votar, cofre…) |
| **Iconos animados** | Lucide + Framer Motion reactivos |
| **Haptics** | Vibración en acciones (configurable) |
| **Instalar PWA** | Banner automático + iconos 192/512 |
| **Compartir invitación** | Web Share API / copiar link |
| **Preferencias** | Sonido, vibración, reduced motion |
| **Logros** | 8 achievements desbloqueables |
| **Equipos por género** | Stats en Gran Final |
| **Deep-link Arena** | Evento → juego directo (`?game=redlight`) |
| **Feed enriquecido** | Propuestas, penalizaciones, pistas |
| **Offline banner** | Aviso sin conexión |
| **Admin** | Push custom · aprobar canjes · revelar confesiones |

---

## Deploy producción

> Passkey y Push **requieren HTTPS**.

### URLs oficiales

| Servicio | URL |
|----------|-----|
| **Frontend (Vercel)** | https://los4-beast.vercel.app |
| **Backend (Koyeb)** | https://los4-game-aurelio104-6f5cac3b.koyeb.app |

> **Importante:** `i--beast.vercel.app` y variantes similares **no existen** (404). Si la PWA se instaló desde una URL vieja, elimínala y reinstala desde `los4-beast.vercel.app`.

### Verificar producción

```bash
npm run test:smoke:prod
WEB_BASE=https://los4-beast.vercel.app API_BASE=https://los4-game-aurelio104-6f5cac3b.koyeb.app/api npm run test:e2e:boot
```

### Frontend (Vercel)

Proyecto en carpeta `frontend/` (contiene `vercel.json` con proxy `/api` → Koyeb).

```bash
cd frontend && vercel --prod
```

Variables en **Koyeb** (backend):

- `FRONTEND_URL=https://los4-beast.vercel.app`
- `APP_PUBLIC_URL=https://los4-beast.vercel.app`
- `WEBAUTHN_RP_ID=los4-beast.vercel.app`
- `WEBAUTHN_ORIGIN=https://los4-beast.vercel.app`
- `CORS_ORIGINS=https://los4-beast.vercel.app,https://los4-beast-*.vercel.app`

### Backend (Koyeb)

- Imagen/carpeta `backend/` con `start.sh`
- Volumen `los4-data-fra` montado en `/data`
- Variables: `DATABASE_URL`, `JWT_SECRET`, `VAPID_*`, `CHALLENGE_DATE`, URLs anteriores

---

## Estructura

```
los4/
├── backend/          API Express + Prisma SQLite
├── frontend/         React 19 + Vite PWA
│   ├── src/pages/    Hub, Arena, Tienda, Finale, Admin…
│   ├── src/lib/      actionInfo, haptics, preferences
│   └── public/       wallpapers, PWA icons
└── README.md
```
