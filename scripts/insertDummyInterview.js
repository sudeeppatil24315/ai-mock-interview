// Insert a specific interview document into Firestore `interviews`
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

    const interview = {
      role: 'Python Developer',
      level: 'beginner',
      type: 'technical',
      techstack: ['Python', 'Django'],
      questions: [
        'What are the main differences between a list and a tuple in Python?',
        'How do you create and activate a virtual environment in Python?',
        'Explain what PEP 8 is and why following it is important.',
        'What are Python decorators and when would you use one?',
        'How does exception handling work in Python (try/except/finally)?'
      ],
      userId: process.env.DUMMY_USER_ID || 'dummy-user',
      finalized: true,
      coverImage: '/covers/openai.png',
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('interviews').add(interview);
    console.log('Inserted interview with id:', ref.id);
    process.exit(0);
  } catch (e) {
    console.error('Insert failed:', e.message);
    process.exit(1);
  }
})();


