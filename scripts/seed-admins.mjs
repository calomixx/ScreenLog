import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Marca las cuentas que pueden abrir el panel de administración.
 * Las reglas de Firestore usan `admins/{uid}` para autorizar la lista de
 * usuarios, así que el panel funciona sin credenciales en el servidor.
 */

const DATABASE_IDS = [
  'ai-studio-screenlogclasifi-9e808bfd-5bc7-44a8-ab49-74fba977ae4a',
  '(default)',
];

const ADMINS = [
  { uid: 'bZGMhRTm7aOUoRDlYbabZN2Aotk2', email: 'daemon@screenlog.app', role: 'owner' },
];

async function main() {
  const sa = JSON.parse(readFileSync('serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(sa), projectId: sa.project_id });

  for (const databaseId of DATABASE_IDS) {
    const db = getFirestore(undefined, databaseId);
    for (const admin of ADMINS) {
      await db
        .collection('admins')
        .doc(admin.uid)
        .set({ ...admin, updatedAt: new Date() }, { merge: true });
      console.log(`OK ${databaseId} -> admins/${admin.uid} (${admin.role})`);
    }
  }
}

void main();
