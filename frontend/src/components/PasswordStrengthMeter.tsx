import { evaluatePassword } from '../lib/passwordStrength';
import { Check, X } from 'lucide-react';

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = evaluatePassword(password);
  const items = [
    { key: 'length', label: 'Mínimo 10 caracteres', ok: strength.checks.length },
    { key: 'upper', label: 'Una mayúscula', ok: strength.checks.upper },
    { key: 'lower', label: 'Una minúscula', ok: strength.checks.lower },
    { key: 'number', label: 'Un número', ok: strength.checks.number },
    { key: 'special', label: 'Un símbolo (!@#$…)', ok: strength.checks.special }
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)'
            }}
          />
        ))}
      </div>
      <p className="text-xs font-semibold" style={{ color: strength.color }}>
        {password ? strength.label : 'Escribe tu contraseña'}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className={`flex items-center gap-2 text-xs ${item.ok ? 'text-reto-cyan' : 'text-white/40'}`}>
            {item.ok ? <Check size={12} /> : <X size={12} className="text-white/25" />}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
