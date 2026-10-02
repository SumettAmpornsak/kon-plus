// Firebase Configuration and Initialization for Kon Plus
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Default config can be read from environment variables or localStorage for customizable setups
const getFirebaseConfig = () => {
  const storedConfig = localStorage.getItem('kon_plus_firebase_config');
  if (storedConfig) {
    try {
      return JSON.parse(storedConfig);
    } catch (e) {
      console.error('Invalid stored Firebase config', e);
    }
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-DEMO-KON-PLUS-KEY-0000000000",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kon-plus-prod.firebaseapp.com",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://kon-plus-prod-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kon-plus-prod",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kon-plus-prod.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:100000000000:web:abcdef123456"
  };
};

const firebaseConfig = getFirebaseConfig();

export const isDemoConfig = firebaseConfig.apiKey.includes('DEMO');

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const rtdb = getDatabase(app);

export function saveCustomFirebaseConfig(config) {
  localStorage.setItem('kon_plus_firebase_config', JSON.stringify(config));
  window.location.reload();
}

export function clearCustomFirebaseConfig() {
  localStorage.removeItem('kon_plus_firebase_config');
  window.location.reload();
}

export default app;
