// Get Firebase services from firebase_config.js
const auth = firebase.auth();
const db = firebase.firestore();

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('.btn-login');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // Show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login successful:', userCredential.user.email);
        
        // Verify user exists in Firestore before redirecting
        const userDoc = await db.collection('hospitals').doc(userCredential.user.uid).get();
        
        if (userDoc.exists) {
            console.log('✅ Hospital data found, redirecting...');
            
            // Simple direct redirect
            window.location.href = './dashboard.html';
        } else {
            console.error('❌ Hospital data not found');
            throw new Error('Hospital data not found. Please contact support.');
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Reset button state
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }
        
        // Handle specific error cases
        let errorMessage = 'Login failed: ';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'No hospital account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Invalid password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage += 'Too many failed attempts. Please try again later.';
                break;
            default:
                errorMessage += error.message;
        }
        
        alert(errorMessage);
    }
});

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('✅ User logged in:', user.email);
        
        try {
            // Verify user data exists in Firestore
            const userDoc = await db.collection('hospitals').doc(user.uid).get();
            
            // Get current page path
            const currentPage = window.location.pathname;
            const isLoginPage = currentPage.includes('index.html') || currentPage === '/' || currentPage.endsWith('/');
            const isDashboardPage = currentPage.includes('dashboard.html');
            
            if (userDoc.exists) {
                if (isLoginPage) {
                    console.log('✅ Auto-redirecting to dashboard...');
                    window.location.replace('./dashboard.html');
                }
            } else if (!isDashboardPage) {
                // If no hospital data found and not already on dashboard, redirect to login
                console.error('❌ Hospital data not found');
                auth.signOut();
                window.location.replace('./index.html');
            }
        } catch (error) {
            console.error('❌ Error checking user data:', error);
            auth.signOut();
            window.location.replace('./index.html');
        }
    } else {
        console.log('ℹ️ No user logged in');
        // If no user and on dashboard page, redirect to login
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.replace('./index.html');
        }
    }
});
