import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gamepad2, Package, Gift, User, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RetoLogo } from './RetoLogo';
import { haptic } from '../lib/haptics';
import { prefetchRoute } from '../lib/prefetch-routes';

type NavItem =
  | { path: string; logo: true; label?: string }
  | { path: string; icon: LucideIcon; label: string; accent?: 'gold' };

const NAV_ITEMS: NavItem[] = [
  { path: '/', logo: true, label: 'Inicio' },
  { path: '/arena', icon: Gamepad2, label: 'Arena' },
  { path: '/cofre', icon: Package, label: 'Cofre' },
  { path: '/tienda', icon: Gift, label: 'Tienda' },
  { path: '/perfil', icon: User, label: 'Perfil' }
];

type BottomNavProps = {
  showAdmin?: boolean;
};

export function BottomNav({ showAdmin }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = showAdmin
    ? [...NAV_ITEMS, { path: '/admin', icon: Settings, label: 'Admin', accent: 'gold' }]
    : NAV_ITEMS;

  return (
    <div className="bottom-nav-bar">
      <div className="bottom-nav-inner glass-strong glass-aurora-top rounded-3xl p-1.5 sm:p-2">
        {items.map((item) => {
          const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                haptic('light');
                navigate(item.path);
              }}
              onPointerEnter={() => prefetchRoute(item.path)}
              onFocus={() => prefetchRoute(item.path)}
              className="bottom-nav-btn relative"
              aria-label={'logo' in item ? 'Inicio' : item.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-reto-pink/20 via-reto-purple/15 to-transparent border border-white/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className={`relative z-10 flex items-center justify-center ${active ? 'nav-icon-active' : 'nav-icon-idle'}`}>
                {'logo' in item ? (
                  <RetoLogo size="xs" className={active ? '' : 'opacity-55'} glow={active} />
                ) : (
                  (() => {
                    const Icon = item.icon;
                    const accentClass = item.accent === 'gold' ? 'text-reto-gold' : active ? 'text-white' : 'text-white/55';
                    return <Icon size={20} strokeWidth={active ? 2.25 : 1.75} className={accentClass} />;
                  })()
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
