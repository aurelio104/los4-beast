import { ReactNode } from 'react';

type PageVariant = 'default' | 'tall' | 'tabbar' | 'chat';

const variantClass: Record<PageVariant, string> = {
  default: '',
  tall: 'page-shell--tall',
  tabbar: 'page-shell--tabbar',
  chat: 'page-shell--chat'
};

export function PageContainer({
  children,
  variant = 'default',
  className = ''
}: {
  children: ReactNode;
  variant?: PageVariant;
  className?: string;
}) {
  return (
    <div className={`app-container page-shell ${variantClass[variant]} ${className}`.trim()}>
      {children}
    </div>
  );
}
