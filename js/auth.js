

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
        
        // ✅ MOBILE-FRIENDLY REDIRECT - Triple fallback system
        setTimeout(() => {
            console.log('Redirecting to dashboard...');
            
            // Method 1: Most compatible (works on 99% of browsers)
            window.location.href = 'dashboard.html';
            
            // Method 2: Fallback for older browsers
            setTimeout(() => {
                if (window.location.pathname.includes('index.html')) {
                    window.location.assign('dashboard.html');
                }
            }, 500);
            
            // Method 3: Last resort fallback
            setTimeout(() => {
                if (window.location.pathname.includes('index.html')) {
                    window.location.replace('dashboard.html');
                }
            }, 1000);
        }, 800);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Show error
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }
        
        alert('Login failed: ' + error.message);
    }
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('✅ User logged in:', user.email);
        
        // If on login page, redirect to dashboard
        const currentPage = window.location.pathname;
        if (currentPage.includes('index.html') || currentPage === '/') {
            console.log('Auto-redirecting to dashboard...');
            window.location.href = 'dashboard.html';
        }
    } else {
        console.log('ℹ️ No user logged in');
    }
});
