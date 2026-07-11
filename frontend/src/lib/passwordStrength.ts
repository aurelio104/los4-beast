export type PasswordStrength = {
  score: number; // 0-4
  label: 'Muy débil' | 'Débil' | 'Regular' | 'Fuerte' | 'Muy fuerte';
  color: string;
  checks: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    special: boolean;
  };
};

export function evaluatePassword(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 10,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  const passed = Object.values(checks).filter(Boolean).length;
  let score = 0;
  if (password.length >= 8) score = 1;
  if (password.length >= 10 && passed >= 3) score = 2;
  if (password.length >= 12 && passed >= 4) score = 3;
  if (password.length >= 14 && passed >= 5) score = 4;

  const labels: PasswordStrength['label'][] = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
  const colors = ['#ef233c', '#ff6b35', '#ffbe0b', '#06d6a0', '#8338ec'];

  return {
    score,
    label: labels[score],
    color: colors[score],
    checks
  };
}

export function isPasswordStrongEnough(password: string): boolean {
  const s = evaluatePassword(password);
  return s.score >= 2 && password.length >= 10;
}
