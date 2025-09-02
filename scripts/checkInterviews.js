// Quick Firestore read: print latest interview document
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function init() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const svc = JSON.parse(json);
    initializeApp({
      credential: cert({
        projectId: svc.project_id,
        clientEmail: svc.client_email,
        privateKey: svc.private_key,
      }),
    });
    return;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: applicationDefault() });
    return;
  }
  throw new Error('No Firebase admin credentials available');
}

(async () => {
  try {
    init();
    const db = getFirestore();
    const snap = await db
      .collection('interviews')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (snap.empty) {
      console.log('No interviews found.');
      process.exit(0);
    }
    const doc = snap.docs[0];
    console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
  } catch (e) {
    console.error('Read failed:', e.message);
    process.exit(1);
  }
})();


