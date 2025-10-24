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
        statusDiv.textContent = '✅ Login successful! Redirecting...';
        statusDiv.style.display = 'block';
        
        // ✅ FIXED: Multiple redirect methods for mobile compatibility
        setTimeout(() => {
            // Try window.location.href first (most compatible)
            window.location.href = 'dashboard.html';
            
            // Fallback methods
            setTimeout(() => {
                window.location.assign('dashboard.html');
            }, 500);
            
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 1000);
        }, 800);
        
    } catch (error) {
        console.error('Login error:', error);
        statusDiv.className = 'status-message error';
        statusDiv.textContent = '❌ ' + error.message;
        statusDiv.style.display = 'block';
        
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
    }
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User logged in:', user.email);
        
        // If on login page, redirect to dashboard
        const currentPage = window.location.pathname;
        if (currentPage.includes('index.html') || currentPage === '/') {
            console.log('Redirecting to dashboard...');
            window.location.href = 'dashboard.html';
        }
    } else {
        console.log('No user logged in');
    }
});
