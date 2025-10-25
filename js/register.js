

// ==========================================
// ALLOW ACCESS TO REGISTRATION PAGE
// Remove auto-redirect check - user should be able to access registration
// ==========================================

// NOTE: We removed the auth.onAuthStateChanged check here
// This allows users to access the registration page even if logged in
// If they're already logged in, they can create another account or logout first

// ==========================================
// REGISTRATION FORM HANDLER
// ==========================================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const hospitalName = document.getElementById('hospitalName').value.trim();
    const hfrNumber = document.getElementById('hfrNumber').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const pincode = document.getElementById('pincode').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const emergencyPhone = document.getElementById('emergencyPhone').value.trim();
    const email = document.getElementById('email').value.trim();
    const adminName = document.getElementById('adminName').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    
    // ==========================================
    // VALIDATION
    // ==========================================
    
    // Password match validation
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    // Password length validation
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long!', 'error');
        return;
    }
    
    // HFR Number validation (12-14 digits)
    if (hfrNumber.length < 12 || hfrNumber.length > 14) {
        showNotification('HFR Number must be 12-14 digits!', 'error');
        return;
    }
    
    // Check if HFR contains only numbers
    if (!/^\d+$/.test(hfrNumber)) {
        showNotification('HFR Number must contain only digits!', 'error');
        return;
    }
    
    // Phone number validation (10 digits)
    if (phone.length !== 10 || emergencyPhone.length !== 10) {
        showNotification('Phone numbers must be exactly 10 digits!', 'error');
        return;
    }
    
    // Pincode validation (6 digits)
    if (pincode.length !== 6) {
        showNotification('Pincode must be exactly 6 digits!', 'error');
        return;
    }
    
    // Terms and conditions validation
    if (!terms) {
        showNotification('Please accept the Terms & Conditions!', 'error');
        return;
    }
    
    // Show loading
    const spinner = document.getElementById('loadingSpinner');
    const form = document.getElementById('registerForm');
    form.style.display = 'none';
    spinner.classList.remove('hidden');
    
    try {
        // ==========================================
        // LOGOUT CURRENT USER IF LOGGED IN
        // ==========================================
        const currentUser = auth.currentUser;
        if (currentUser) {
            console.log('Logging out current user before creating new account...');
            await auth.signOut();
        }
        
        // ==========================================
        // CHECK IF HFR NUMBER ALREADY EXISTS
        // ==========================================
        const hfrCheck = await db.collection('hospitals')
            .where('hfrNumber', '==', hfrNumber)
            .get();
        
        if (!hfrCheck.empty) {
            throw new Error('HFR Number is already registered! Please use a different HFR Number.');
        }
        
        // ==========================================
        // CHECK IF EMAIL ALREADY EXISTS
        // ==========================================
        const emailCheck = await db.collection('hospitals')
            .where('email', '==', email)
            .get();
        
        if (!emailCheck.empty) {
            throw new Error('Email is already registered! Please use a different email or login.');
        }
        
        // ==========================================
        // CREATE FIREBASE AUTH USER
        // ==========================================
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('User created:', user.uid);
        
        // ==========================================
        // CREATE HOSPITAL DOCUMENT IN FIRESTORE
        // ==========================================
        await db.collection('hospitals').doc(user.uid).set({
            // Hospital Information
            hospitalName: hospitalName,
            hfrNumber: hfrNumber,
            address: address,
            city: city,
            state: state,
            pincode: pincode,
            
            // Contact Information
            phone: phone,
            emergencyPhone: emergencyPhone,
            email: email,
            
            // Admin Information
            adminName: adminName,
            
            // Account Status
            status: 'active',
            verified: false,
            
            // Timestamps
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Hospital document created successfully');
        
        // ==========================================
        // INITIALIZE DEFAULT BED DATA
        // ==========================================
        await db.collection('beds').doc(user.uid).set({
            hospitalId: user.uid,
            general: { total: 0, available: 0, occupied: 0 },
            icu: { total: 0, available: 0, occupied: 0 },
            emergency: { total: 0, available: 0, occupied: 0 },
            private: { total: 0, available: 0, occupied: 0 },
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Default bed data initialized');
        
        // ==========================================
        // SUCCESS - REDIRECT TO DASHBOARD
        // ==========================================
        showNotification('Registration successful! Redirecting to dashboard...', 'success');
        
        // Wait 2 seconds to show success message
        setTimeout(() => {
            window.location.replace('dashboard.html');  
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Show error message
        let errorMessage = 'Registration failed: ' + error.message;
        
        // Handle specific Firebase errors
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email is already registered! Please login or use a different email.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address! Please enter a valid email.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak! Please use a stronger password.';
        }
        
        showNotification(errorMessage, 'error');
        
        // Show form again
        form.style.display = 'block';
        spinner.classList.add('hidden');
    }
});

// ==========================================
// REAL-TIME HFR NUMBER VALIDATION
// ==========================================
document.getElementById('hfrNumber').addEventListener('input', (e) => {
    const hfrNumber = e.target.value;
    e.target.value = hfrNumber.replace(/\D/g, '');
    
    if (e.target.value.length >= 12 && e.target.value.length <= 14) {
        e.target.style.borderColor = '#10B981';
    } else {
        e.target.style.borderColor = '#EF4444';
    }
});

// ==========================================
// REAL-TIME PHONE NUMBER VALIDATION
// ==========================================
['phone', 'emergencyPhone'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('input', (e) => {
        const phoneNumber = e.target.value;
        e.target.value = phoneNumber.replace(/\D/g, '');
        
        if (e.target.value.length === 10) {
            e.target.style.borderColor = '#10B981';
        } else {
            e.target.style.borderColor = '#EF4444';
        }
    });
});

// ==========================================
// REAL-TIME PINCODE VALIDATION
// ==========================================
document.getElementById('pincode').addEventListener('input', (e) => {
    const pincode = e.target.value;
    e.target.value = pincode.replace(/\D/g, '');
    
    if (e.target.value.length === 6) {
        e.target.style.borderColor = '#10B981';
    } else {
        e.target.style.borderColor = '#EF4444';
    }
});

// ==========================================
// PASSWORD MATCH VALIDATION
// ==========================================
document.getElementById('confirmPassword').addEventListener('input', (e) => {
    const password = document.getElementById('password').value;
    const confirmPassword = e.target.value;
    
    if (password === confirmPassword && confirmPassword.length >= 6) {
        e.target.style.borderColor = '#10B981';
    } else {
        e.target.style.borderColor = '#EF4444';
    }
});

// ==========================================
// NOTIFICATION SYSTEM
// ==========================================
function showNotification(message, type = 'info') {
    const colors = {
        success: '#10B981',
        error: '#EF4444',
        info: '#3B82F6',
        warning: '#F59E0B'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('Registration script loaded successfully');
