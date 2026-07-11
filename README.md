# LOS 4 — Beast Protocol PWA

PWA interactiva estilo MrBeast para el reto del **29 de agosto de 2026**.

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

## Invitar amigos

```
http://localhost:3011/join/BEAST2026
```

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
| **Logros Beast** | 8 achievements desbloqueables |
| **Equipos por género** | Stats en Gran Final |
| **Deep-link Arena** | Evento → juego directo (`?game=redlight`) |
| **Feed enriquecido** | Propuestas, penalizaciones, pistas |
| **Offline banner** | Aviso sin conexión |
| **Admin** | Push custom · aprobar canjes · revelar confesiones |

---

## Deploy producción

> Passkey y Push **requieren HTTPS**.

### Frontend (Vercel)
```bash
cd frontend && vercel --prod
```
Configura `VITE_API_URL` o proxy al backend.

### Backend (Railway / Fly / Render)
- Subir carpeta `backend/`
- Variables: `DATABASE_URL`, `JWT_SECRET`, `VAPID_*`, `CHALLENGE_DATE`, `INVITE_CODE`
- Puerto `3010`

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
