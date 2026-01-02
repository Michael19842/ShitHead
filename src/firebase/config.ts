// Firebase configuration
// We only use Auth (anonymous) and Firestore - both free on Spark plan
// No Storage needed!
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBPf3mruHJas8GFsOjrbT1u_B6pPkaGj-o',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'shithead-54eb8.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shithead-54eb8',
  storageBucket: "shithead-54eb8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '729390558386',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:729390558386:web:9e37f5121ed06ae705adab',
  measurementId: "G-B19QK856LM"
};
