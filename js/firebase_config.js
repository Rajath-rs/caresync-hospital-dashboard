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
let app;
try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
    } else {
        app = firebase.app();
        console.log('✅ Firebase already initialized');
    }

    // Initialize Analytics
    firebase.analytics();
    console.log('✅ Firebase Analytics initialized');

    // Export Firebase services
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    const analytics = firebase.analytics();

    // Configure Firestore
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });

    // Enable offline persistence with multi-tab support
    db.enablePersistence({
        synchronizeTabs: true
    }).then(() => {
        console.log('✅ Offline persistence enabled with multi-tab support');
    }).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open, persistence enabled in first tab only');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser does not support persistence');
        }
    });

    // Make services globally available
    window.auth = auth;
    window.db = db;
    window.storage = storage;
    window.fbAnalytics = analytics;

    console.log('✅ Firebase services exported globally');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    alert('Error initializing Firebase. Please check console for details.');
}

// Log initialization success
console.log('Firebase config loaded successfully');
