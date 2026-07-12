const prefetched = new Set<string>();

const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Hub'),
  '/arena': () => import('../pages/Arena'),
  '/cofre': () => import('../pages/Cofre'),
  '/tienda': () => import('../pages/Tienda'),
  '/perfil': () => import('../pages/Perfil'),
  '/chat': () => import('../pages/Chat'),
  '/eventos': () => import('../pages/Eventos')
};

export function prefetchRoute(path: string) {
  const fn = routeImports[path];
  if (!fn || prefetched.has(path)) return;
  prefetched.add(path);
  void fn();
}

export function prefetchMainRoutes() {
  ['/arena', '/cofre', '/tienda', '/perfil'].forEach(prefetchRoute);
}
