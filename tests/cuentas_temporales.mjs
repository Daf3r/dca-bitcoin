// Cuentas de pruebas de navegador. Cada proceso comparte sus claves aleatorias solo con los servidores locales que arranca.
import { randomBytes } from 'node:crypto';

export const ADMIN = ['Daf3r', randomBytes(24).toString('hex')];
export const LECTOR = ['Ana', randomBytes(24).toString('hex')];
export const entornoCuentas = { PRUEBA_ADMIN: ADMIN[1], PRUEBA_LECTOR: LECTOR[1] };
