// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDCBK1yTGO82E4I4V8K-Kfse3SRYsIQ3i0",
    authDomain: "caresync-f80c4.firebaseapp.com",
    projectId: "caresync-f80c4",
    storageBucket: "caresync-f80c4.firebasestorage.app",
    messagingSenderId: "655842183730",
    appId: "1:655842183730:web:bf3abe3833d6afbec42a12",
    measurementId: "G-0D24PNR1RB"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const statusDiv = document.getElementById('loginStatus');
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        statusDiv.className = 'status-message success';
        statusDiv.textContent = 'Login successful! Redirecting...';
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            window.location.replace('dashboard.html');  // ✅ FIXED
        }, 1000);
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = error.message;
        statusDiv.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
    }
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('index.html')) {
        console.log('User already logged in, redirecting to dashboard');
        window.location.replace('dashboard.html');  // ✅ FIXED
    }
});
