import { isPasswordStrongEnough } from './passwordStrength';

/** PIN numérico 4–6 dígitos (cuentas creadas por admin). */
export function isValidPinPassword(password: string): boolean {
  return /^\d{4,6}$/.test(password);
}

export function isPasswordOrPinValid(password: string): boolean {
  return isValidPinPassword(password) || isPasswordStrongEnough(password);
}

export function passwordHint(): string {
  return 'PIN de 4–6 dígitos o contraseña segura (mín. 10 caracteres)';
}
