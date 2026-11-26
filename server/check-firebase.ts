/**
 * Verifica que el servidor pueda abrir sesiones de Firebase sin Email/Password.
 * Uso:  npm run firebase:check
 */
import { getFirebaseAdminStatus, createFirebaseCustomToken } from './firebase-admin';

async function main() {
  const status = getFirebaseAdminStatus();
  if (!status.ready) {
    console.error('\n[FALTA] ' + status.message + '\n');
    process.exitCode = 1;
    return;
  }

  const token = await createFirebaseCustomToken(
    'diagnostico-local',
    'diagnostico@screeamlog.local',
    'Diagnóstico',
  );
  if (!token || token.length < 50) {
    console.error('\n[ERROR] Firebase no devolvió un token válido.\n');
    process.exitCode = 1;
    return;
  }
  console.log('\n[OK] Firebase Admin funciona: el servidor puede firmar sesiones.\n');
}

main().catch((error) => {
  console.error('\n[ERROR]', error instanceof Error ? error.message : error, '\n');
  process.exitCode = 1;
});
