const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const store = require('./server/data/store.json');

const firebaseConfig = {
  apiKey: "AIzaSyAZgINMqvi9CETXyIBznGic1QfTyLB44ec",
  authDomain: "screeamlog.firebaseapp.com",
  projectId: "screeamlog",
  storageBucket: "screeamlog.firebasestorage.app",
  messagingSenderId: "902900722838",
  appId: "1:902900722838:web:aee7c230037efe643466b7",
  measurementId: "G-BNC0EBKEEY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log(`Starting migration of ${store.media.length} items to Firestore...`);
  let count = 0;
  for (const item of store.media) {
    try {
      const mediaRef = doc(db, 'catalog_media', item.id);
      await setDoc(mediaRef, {
        authorId: 'admin_initial_sync',
        title: item.title,
        originalTitle: item.originalTitle || item.title,
        type: item.type || 'pelicula',
        year: item.year || 2024,
        director: item.director || 'Desconocido',
        synopsis: item.synopsis || '',
        posterUrl: item.posterUrl || '',
        backdropUrl: item.backdropUrl || item.posterUrl || '',
        duration: item.duration || '2h 00m',
        defaultPlatform: item.defaultPlatform || 'Cine / Sala',
        genres: Array.isArray(item.genres) ? item.genres : ['Drama'],
        rating: item.rating || 0,
        ratingCount: item.ratingCount || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      count++;
      console.log(`[${count}/${store.media.length}] Sincronizado: ${item.title} (${item.year})`);
    } catch (err) {
      console.error(`Error al sincronizar ${item.title}:`, err.message);
    }
  }
  console.log(`Finished! Successfully synced ${count} items to Firestore.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in seed:', err);
  process.exit(1);
});
