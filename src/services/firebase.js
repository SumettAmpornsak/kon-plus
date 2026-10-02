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
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA__GZHkv-iCeqM37EWzUgSpX8AIOTli5k",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "konplus.firebaseapp.com",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://konplus-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "konplus",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "konplus.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "699334258722",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:699334258722:web:c9c82cf3fa4cd7b165da7b"
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
