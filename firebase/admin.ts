import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  const apps = getApps();

  if (!apps.length) {
    try {
      console.log("Initializing Firebase Admin SDK");
      
      // 1) Try FIREBASE_SERVICE_ACCOUNT_B64 (base64 of full JSON)
      const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
      if (serviceAccountB64) {
        const json = Buffer.from(serviceAccountB64, "base64").toString("utf8");
        const svc = JSON.parse(json);
        console.log("Using FIREBASE_SERVICE_ACCOUNT_B64 credentials");
        initializeApp({
          credential: cert({
            projectId: svc.project_id,
            clientEmail: svc.client_email,
            privateKey: svc.private_key,
          }),
        });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // 2) Try FIREBASE_SERVICE_ACCOUNT (raw JSON string)
        const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("Using FIREBASE_SERVICE_ACCOUNT credentials");
        initializeApp({
          credential: cert({
            projectId: svc.project_id,
            clientEmail: svc.client_email,
            privateKey: svc.private_key,
          }),
        });
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        // 3) Fallback to individual env vars
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
        console.log("Using individual FIREBASE_* env vars");
        console.log("Project ID:", process.env.FIREBASE_PROJECT_ID);
        console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
        console.log("Private Key defined:", !!privateKey);
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
        });
      } else {
        // 4) Last resort: application default credentials
        console.log("Using applicationDefault credentials (GOOGLE_APPLICATION_CREDENTIALS)");
        initializeApp({
          credential: applicationDefault(),
        });
      }
      
      console.log("Firebase Admin SDK initialized successfully");
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);
      throw error; // Re-throw to make initialization failures more visible
    }
  } else {
    console.log("Firebase Admin SDK already initialized");
  }

  const auth = getAuth();
  const db = getFirestore();
  
  return { auth, db };
}

export const { auth, db } = initFirebaseAdmin();