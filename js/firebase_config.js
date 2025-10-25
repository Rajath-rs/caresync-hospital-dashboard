// ============================================
// FIREBASE CONFIGURATION - CENTRALIZED
// File: firebase-config.js
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyBnqbxn9N4J1lOOh7pDP7StcTfuM16mBTs",
  authDomain: "caresync-2e5d4.firebaseapp.com",
  projectId: "caresync-2e5d4",
  storageBucket: "caresync-2e5d4.firebasestorage.app",
  messagingSenderId: "588308758613",
  appId: "1:588308758613:web:af393fd9804841cce294dc",
  measurementId: "G-WQF201CXDY"
};

// Initialize Firebase (only once)
let firebaseApp;
try {
    if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
    } else {
        firebaseApp = firebase.app();
        console.log('✅ Firebase already initialized');
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence
db.enablePersistence()
  .then(() => {
      console.log('✅ Offline persistence enabled');
  })
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn('⚠️ Multiple tabs open, persistence only works in one tab');
      } else if (err.code == 'unimplemented') {
          console.warn('⚠️ Browser does not support persistence');
      }
  });

console.log('Firebase config loaded');
