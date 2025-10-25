// ==========================================
// CARESYNC HOSPITAL DASHBOARD - FIXED
// Firestore bed data now saves permanently!
// ==========================================

let currentUser = null;
let currentHospitalId = null;
let currentBedCategory = null;

window.history.pushState(null, null, window.location.href);
window.onpopstate = function() {
    window.history.pushState(null, null, window.location.href);
};

// ==========================================
// AUTHENTICATION
// ==========================================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.replace('index.html');
        return;
    }
    
    currentUser = user;
    currentHospitalId = user.uid;
    console.log('✅ User authenticated:', currentHospitalId);
    
    await initializeDashboard();
});

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================
async function initializeDashboard() {
    try {
        showNotification('Loading dashboard...', 'info');
        
        // Load hospital profile
        const hospitalDoc = await db.collection('hospitals').doc(currentHospitalId).get();
        
        if (hospitalDoc.exists) {
            document.getElementById('hospitalName').textContent = hospitalDoc.data().hospitalName || 'Hospital';
        }
        
        // Initialize bed data
        await initializeBedData();
        
        // Load all data
        await loadStatistics();
        await loadBedManagement();
        
        // Setup navigation
        setupNavigation();
        
        // Listen to emergency alerts
        listenToEmergencyAlerts();
        
        showNotification('Dashboard loaded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        showNotification('Error loading dashboard: ' + error.message, 'error');
    }
}

// ==========================================
// BED DATA INITIALIZATION - FIXED
// ==========================================
async function initializeBedData() {
    try {
        const bedTypes = ['general', 'icu', 'emergency', 'private'];
        
        for (const type of bedTypes) {
            const bedDocRef = db.collection('hospitals')
                .doc(currentHospitalId)
                .collection('beds')
                .doc(type);
            
            const bedDoc = await bedDocRef.get();
            
            if (!bedDoc.exists) {
                console.log(`Creating default bed data for ${type}...`);
                
                await bedDocRef.set({
                    type: type,
                    total: 0,
                    available: 0,
                    occupied: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`✅ Default bed data created for ${type}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error initializing bed data:', error);
        throw error;
    }
}

// ==========================================
// BED MANAGEMENT - FIXED
// ==========================================
async function loadBedManagement() {
    try {
        const bedTypes = ['general', 'icu', 'emergency', 'private'];
        let totalAvailable = 0;
        
        for (const type of bedTypes) {
            const bedDoc = await db.collection('hospitals')
                .doc(currentHospitalId)
                .collection('beds')
                .doc(type)
                .get();
            
            if (bedDoc.exists) {
                const bedData = bedDoc.data();
                updateBedDisplay(type, bedData);
                totalAvailable += (bedData.available || 0);
            } else {
                // Initialize if doesn't exist
                await initializeBedData();
                await loadBedManagement();
                return;
            }
        }
        
        // Update total available beds in overview
        const availableBedsElem = document.getElementById('availableBeds');
        if (availableBedsElem) {
            availableBedsElem.textContent = totalAvailable;
        }
        
    } catch (error) {
        console.error('❌ Error loading beds:', error);
        showNotification('Error loading bed data', 'error');
    }
}

function updateBedDisplay(category, data) {
    const totalElem = document.getElementById(`${category}-total`);
    const availableElem = document.getElementById(`${category}-available`);
    const occupiedElem = document.getElementById(`${category}-occupied`);
    
    if (totalElem) totalElem.textContent = data.total || 0;
    if (availableElem) availableElem.textContent = data.available || 0;
    if (occupiedElem) occupiedElem.textContent = data.occupied || 0;
    
    console.log(`Updated UI for ${category}:`, data);
}

// ==========================================
// BED MODAL FUNCTIONS - FIXED
// ==========================================
function openBedModal(category) {
    currentBedCategory = category;
    
    const modal = document.getElementById('bedModal');
    const title = document.getElementById('bedModalTitle');
    
    // Close any other open modals first
    closeAmbulanceModal();
    
    title.textContent = `Manage ${category.charAt(0).toUpperCase() + category.slice(1)} Beds`;
    
    // Load current values from Firestore
    db.collection('hospitals')
        .doc(currentHospitalId)
        .collection('beds')
        .doc(category)
        .get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('bedTotalInput').value = data.total || 0;
                document.getElementById('bedAvailableInput').value = data.available || 0;
            } else {
                document.getElementById('bedTotalInput').value = 0;
                document.getElementById('bedAvailableInput').value = 0;
            }
        })
        .catch(error => {
            console.error('Error loading bed data:', error);
            showNotification('Error loading bed data', 'error');
        });
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeBedModal() {
    const modal = document.getElementById('bedModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restore scroll
    currentBedCategory = null;
    
    // Reset form
    document.getElementById('bedForm').reset();
}

window.openBedModal = openBedModal;
window.closeBedModal = closeBedModal;

// ==========================================
// BED FORM SUBMISSION - COMPLETELY FIXED
// ==========================================
document.getElementById('bedForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentBedCategory) {
        showNotification('Bed category not selected', 'error');
        return;
    }
    
    const total = parseInt(document.getElementById('bedTotalInput').value) || 0;
    const available = parseInt(document.getElementById('bedAvailableInput').value) || 0;
    
    // Validation
    if (available > total) {
        showNotification('Available beds cannot exceed total beds', 'error');
        return;
    }
    
    if (total < 0 || available < 0) {
        showNotification('Bed numbers cannot be negative', 'error');
        return;
    }
    
    const occupied = total - available;
    
    try {
        console.log(`Updating ${currentBedCategory} beds:`, { total, available, occupied });
        
        // Save to Firestore - FIXED PATH
        await db.collection('hospitals')
            .doc(currentHospitalId)
            .collection('beds')
            .doc(currentBedCategory)
            .set({
                type: currentBedCategory,
                total: total,
                available: available,
                occupied: occupied,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        
        console.log(`✅ Bed data saved successfully to Firestore!`);
        
        showNotification('Bed data updated successfully!', 'success');
        
        // Close modal
        closeBedModal();
        
        // Reload bed data to reflect changes
        await loadBedManagement();
        
    } catch (error) {
        console.error('❌ Error updating beds:', error);
        showNotification('Error: ' + error.message, 'error');
    }
});

// ==========================================
// NAVIGATION
// ==========================================
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section') || item.getAttribute('href').replace('#', '');
            if (section) {
                showSection(section);
                document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    const section = document.getElementById(`${sectionName.replace('#', '')}`);
    if (section) {
        section.classList.add('active');
        
        // Load section data
        switch(sectionName.replace('#', '')) {
            case 'beds':
                loadBedManagement();
                break;
            case 'doctors':
                loadDoctors();
                break;
            case 'appointments':
                loadAppointments();
                break;
            case 'ambulance':
                loadAmbulances();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    }
}

window.showSection = showSection;

// ==========================================
// STATISTICS
// ==========================================
async function loadStatistics() {
    try {
        // Doctors
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        document.getElementById('totalDoctors').textContent = doctorsSnap.size;
        
        // Appointments
        const appointmentsSnap = await db.collection('appointments')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        
        const uniquePatients = new Set(appointmentsSnap.docs.map(doc => doc.data().patientId));
        document.getElementById('totalPatients').textContent = uniquePatients.size;
        
        // Today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todaySnap = await db.collection('appointments')
            .where('hospitalId', '==', currentHospitalId)
            .where('appointmentDate', '>=', firebase.firestore.Timestamp.fromDate(today))
            .where('appointmentDate', '<', firebase.firestore.Timestamp.fromDate(tomorrow))
            .get();
        document.getElementById('todayAppointments').textContent = todaySnap.size;
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// ... REST OF YOUR CODE (EMERGENCY ALERTS, AMBULANCES, DOCTORS, APPOINTMENTS, etc.) ...
// Keep all your other functions as they are

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showNotification(message, type = 'info') {
    const colors = {
        'success': '#10B981',
        'error': '#EF4444',
        'info': '#3B82F6',
        'warning': '#F59E0B'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
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
    }, 4000);
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

console.log('✅ Dashboard script loaded successfully');
