// Firebase Configuration - Using COMPAT library for simple HTML/CSS/JS
const firebaseConfig = {
    apiKey: "AIzaSyBnqbxn9N4J1lOOh7pDP7StcTfuM16mBTs",
    authDomain: "caresync-2e5d4.firebaseapp.com",
    projectId: "caresync-2e5d4",
    storageBucket: "caresync-2e5d4.firebasestorage.app",
    messagingSenderId: "588308758613",
    appId: "1:588308758613:web:af393fd9804841cce294dc",
    measurementId: "G-WQF201CXDY"
};

// Initialize Firebase using compat library
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const spinner = document.getElementById('loadingSpinner');
    const form = document.getElementById('loginForm');
    
    try {
        // Show loading
        form.style.display = 'none';
        spinner.classList.remove('hidden');
        
        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Verify user is a hospital
        const hospitalDoc = await db.collection('hospitals').doc(user.uid).get();
        
        if (hospitalDoc.exists) {
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            throw new Error('Unauthorized: Hospital account not found');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
        
        // Show form again
        form.style.display = 'flex';
        spinner.classList.add('hidden');
    }
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('index.html')) {
        window.location.href = 'dashboard.html';
    }
});
