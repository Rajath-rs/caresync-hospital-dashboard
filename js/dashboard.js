// ==========================================
// CARESYNC HOSPITAL DASHBOARD - COMPLETE
// All Management Controls Working
// ==========================================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBnqbxn9N4J1lOOh7pDP7StcTfuM16mBTs",
    authDomain: "caresync-2e5d4.firebaseapp.com",
    projectId: "caresync-2e5d4",
    storageBucket: "caresync-2e5d4.firebasestorage.app",
    messagingSenderId: "588308758613",
    appId: "1:588308758613:web:af393fd9804841cce294dc"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
    
    console.log('User authenticated:', currentHospitalId);
    await initializeDashboard();
});

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
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard: ' + error.message, 'error');
    }
}

// ==========================================
// BED DATA INITIALIZATION
// ==========================================
async function initializeBedData() {
    try {
        const bedDocRef = db.collection('beds').doc(currentHospitalId);
        const bedDoc = await bedDocRef.get();
        
        if (!bedDoc.exists) {
            console.log('Creating default bed data...');
            const defaultBeds = {
                hospitalId: currentHospitalId,
                general: { total: 50, available: 45, occupied: 5 },
                icu: { total: 20, available: 15, occupied: 5 },
                emergency: { total: 30, available: 28, occupied: 2 },
                private: { total: 15, available: 12, occupied: 3 },
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await bedDocRef.set(defaultBeds);
            console.log('Default bed data created');
        }
    } catch (error) {
        console.error('Error initializing bed data:', error);
        throw error;
    }
}

// ==========================================
// NAVIGATION
// ==========================================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            if (section) {
                showSection(section);
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.classList.add('active');
        
        // Load section data
        switch(sectionName) {
            case 'beds': loadBedManagement(); break;
            case 'doctors': loadDoctors(); break;
            case 'appointments': loadAppointments(); break;
            case 'ambulance': loadAmbulances(); break;
            case 'settings': loadSettings(); break;
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
        
        // Patients
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

// ==========================================
// BED MANAGEMENT
// ==========================================
async function loadBedManagement() {
    try {
        const bedDoc = await db.collection('beds').doc(currentHospitalId).get();
        
        if (bedDoc.exists) {
            const bedData = bedDoc.data();
            updateBedDisplay(bedData);
        } else {
            await initializeBedData();
            await loadBedManagement();
        }
    } catch (error) {
        console.error('Error loading beds:', error);
        showNotification('Error loading bed data', 'error');
    }
}

function updateBedDisplay(bedData) {
    const categories = ['general', 'icu', 'emergency', 'private'];
    let totalAvailable = 0;
    
    categories.forEach(category => {
        const data = bedData[category] || { total: 0, available: 0, occupied: 0 };
        
        const totalElem = document.getElementById(`${category}Total`);
        const availableElem = document.getElementById(`${category}Available`);
        const occupiedElem = document.getElementById(`${category}Occupied`);
        const progressElem = document.getElementById(`${category}Progress`);
        
        if (totalElem) totalElem.textContent = data.total;
        if (availableElem) availableElem.textContent = data.available;
        if (occupiedElem) occupiedElem.textContent = data.occupied;
        
        if (progressElem && data.total > 0) {
            const occupancyPercent = (data.occupied / data.total) * 100;
            progressElem.style.width = occupancyPercent + '%';
        }
        
        totalAvailable += data.available;
    });
    
    const availableBedsElem = document.getElementById('availableBeds');
    if (availableBedsElem) availableBedsElem.textContent = totalAvailable;
}

// Bed Modal Functions
function openBedModal(category) {
    currentBedCategory = category;
    const modal = document.getElementById('bedModal');
    const title = document.getElementById('bedModalTitle');
    
    // Close any other open modals first
    closeAmbulanceModal();
    
    title.textContent = `Manage ${category.charAt(0).toUpperCase() + category.slice(1)} Beds`;
    
    // Load current values
    db.collection('beds').doc(currentHospitalId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data()[category];
            document.getElementById('bedTotalInput').value = data.total || 0;
            document.getElementById('bedAvailableInput').value = data.available || 0;
        }
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

// Bed Form Submission
document.getElementById('bedForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentBedCategory) return;
    
    const total = parseInt(document.getElementById('bedTotalInput').value);
    const available = parseInt(document.getElementById('bedAvailableInput').value);
    
    if (available > total) {
        showNotification('Available beds cannot exceed total beds', 'error');
        return;
    }
    
    const occupied = total - available;
    
    try {
        const updateData = {};
        updateData[`${currentBedCategory}.total`] = total;
        updateData[`${currentBedCategory}.available`] = available;
        updateData[`${currentBedCategory}.occupied`] = occupied;
        
        await db.collection('beds').doc(currentHospitalId).update(updateData);
        
        showNotification('Bed data updated successfully!', 'success');
        closeBedModal();
        await loadBedManagement();
        
    } catch (error) {
        console.error('Error updating beds:', error);
        showNotification('Error: ' + error.message, 'error');
    }
});

// ==========================================
// EMERGENCY ALERTS
// ==========================================
function listenToEmergencyAlerts() {
    db.collection('emergencyAlerts')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            const alertsContainer = document.getElementById('emergencyAlerts');
            const recentAlertsContainer = document.getElementById('recentEmergencyAlerts');
            const badge = document.getElementById('emergencyBadge');
            
            if (snapshot.empty) {
                const emptyHTML = `
                    <div class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <p>No active emergencies</p>
                    </div>
                `;
                if (alertsContainer) alertsContainer.innerHTML = emptyHTML;
                if (recentAlertsContainer) recentAlertsContainer.innerHTML = emptyHTML;
                if (badge) badge.textContent = '0';
                return;
            }
            
            if (badge) badge.textContent = snapshot.size;
            if (alertsContainer) alertsContainer.innerHTML = '';
            if (recentAlertsContainer) recentAlertsContainer.innerHTML = '';
            
            snapshot.forEach((doc, index) => {
                const alert = doc.data();
                const alertCard = createAlertCard(doc.id, alert);
                
                if (alertsContainer) alertsContainer.appendChild(alertCard.cloneNode(true));
                if (index < 3 && recentAlertsContainer) {
                    recentAlertsContainer.appendChild(alertCard.cloneNode(true));
                }
            });
        }, (error) => {
            console.error('Error listening to alerts:', error);
        });
}

function createAlertCard(alertId, alert) {
    const card = document.createElement('div');
    card.className = 'alert-card';
    
    const timeAgo = alert.createdAt ? getTimeAgo(alert.createdAt.toDate()) : 'Just now';
    
    card.innerHTML = `
        <div class="alert-icon">
            <i class="fas fa-ambulance"></i>
        </div>
        <div class="alert-info">
            <h4>${alert.patientName || 'Emergency Alert'}</h4>
            <p><i class="fas fa-phone"></i> ${alert.patientPhone || 'N/A'}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${alert.location ? 
                `Lat: ${alert.location.latitude.toFixed(4)}, Lon: ${alert.location.longitude.toFixed(4)}` : 
                'Location unavailable'}</p>
            <span class="alert-time">${timeAgo}</span>
        </div>
        <button class="btn-respond" onclick="respondToEmergency('${alertId}', ${alert.location?.latitude}, ${alert.location?.longitude})">
            <i class="fas fa-route"></i> Navigate
        </button>
    `;
    
    return card;
}

function respondToEmergency(alertId, lat, lon) {
    if (lat && lon) {
        window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
        
        db.collection('emergencyAlerts').doc(alertId).update({
            status: 'responded',
            respondedBy: currentHospitalId,
            respondedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error('Error updating alert:', err));
    } else {
        showNotification('Location not available', 'error');
    }
}

window.respondToEmergency = respondToEmergency;

// ==========================================
// AMBULANCE MANAGEMENT
// ==========================================
async function loadAmbulances() {
    try {
        const ambulanceSnap = await db.collection('ambulances')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        
        let available = 0, active = 0, maintenance = 0;
        
        ambulanceSnap.forEach(doc => {
            const status = doc.data().status;
            if (status === 'available') available++;
            else if (status === 'on-duty') active++;
            else if (status === 'maintenance') maintenance++;
        });
        
        document.getElementById('totalAmbulances').textContent = ambulanceSnap.size;
        document.getElementById('availableAmbulances').textContent = available;
        document.getElementById('activeAmbulances').textContent = active;
        document.getElementById('maintenanceAmbulances').textContent = maintenance;
        
        const ambulanceList = document.getElementById('ambulanceList');
        
        if (ambulanceSnap.empty) {
            ambulanceList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ambulance"></i>
                    <p>No ambulances registered</p>
                    <button class="btn-primary" onclick="openAmbulanceModal()">
                        <i class="fas fa-plus"></i> Add First Ambulance
                    </button>
                </div>
            `;
            return;
        }
        
        ambulanceList.innerHTML = '';
        
        ambulanceSnap.forEach(doc => {
            const ambulance = doc.data();
            const card = createAmbulanceCard(doc.id, ambulance);
            ambulanceList.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading ambulances:', error);
        showNotification('Error loading ambulances', 'error');
    }
}

function createAmbulanceCard(id, ambulance) {
    const card = document.createElement('div');
    card.className = 'ambulance-card';
    
    const statusClass = (ambulance.status || 'available').replace('-', '');
    
    card.innerHTML = `
        <div class="ambulance-header">
            <div class="ambulance-number">
                <i class="fas fa-ambulance"></i>
                ${ambulance.vehicleNumber || 'N/A'}
            </div>
            <span class="ambulance-status ${statusClass}">
                ${(ambulance.status || 'available').replace('-', ' ').toUpperCase()}
            </span>
        </div>
        <div class="ambulance-details">
            <div class="ambulance-detail-item">
                <label>Driver</label>
                <span>${ambulance.driverName || 'N/A'}</span>
            </div>
            <div class="ambulance-detail-item">
                <label>Contact</label>
                <span>${ambulance.driverPhone || 'N/A'}</span>
            </div>
            <div class="ambulance-detail-item">
                <label>Type</label>
                <span>${ambulance.type || 'Basic'}</span>
            </div>
            <div class="ambulance-detail-item">
                <label>Status</label>
                <span>${ambulance.status || 'Available'}</span>
            </div>
        </div>
        <div class="ambulance-actions">
            <button class="btn-track" onclick="updateAmbulanceStatus('${id}')">
                <i class="fas fa-sync"></i> Update Status
            </button>
            <button class="btn-update" onclick="deleteAmbulance('${id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

function openAmbulanceModal() {
    // Close any other open modals first
    closeBedModal();
    
    const modal = document.getElementById('ambulanceModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeAmbulanceModal() {
    const modal = document.getElementById('ambulanceModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restore scroll
    
    // Reset form
    document.getElementById('ambulanceForm').reset();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const bedModal = document.getElementById('bedModal');
    const ambulanceModal = document.getElementById('ambulanceModal');
    
    if (event.target === bedModal) {
        closeBedModal();
    }
    if (event.target === ambulanceModal) {
        closeAmbulanceModal();
    }
}

// Export functions to window
window.openBedModal = openBedModal;
window.closeBedModal = closeBedModal;
window.openAmbulanceModal = openAmbulanceModal;
window.closeAmbulanceModal = closeAmbulanceModal;

// Ambulance Form Submission
document.getElementById('ambulanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const driverName = document.getElementById('driverName').value;
    const driverPhone = document.getElementById('driverPhone').value;
    const type = document.getElementById('ambulanceType').value;
    
    try {
        await db.collection('ambulances').add({
            hospitalId: currentHospitalId,
            vehicleNumber: vehicleNumber,
            driverName: driverName,
            driverPhone: driverPhone,
            type: type,
            status: 'available',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Ambulance added successfully!', 'success');
        closeAmbulanceModal();
        await loadAmbulances();
        
    } catch (error) {
        console.error('Error adding ambulance:', error);
        showNotification('Error: ' + error.message, 'error');
    }
});

function updateAmbulanceStatus(ambulanceId) {
    const newStatus = prompt('Enter new status:\n1. available\n2. on-duty\n3. maintenance');
    
    const validStatuses = ['available', 'on-duty', 'maintenance'];
    if (!newStatus || !validStatuses.includes(newStatus.toLowerCase())) {
        showNotification('Invalid status. Use: available, on-duty, or maintenance', 'error');
        return;
    }
    
    db.collection('ambulances').doc(ambulanceId).update({
        status: newStatus.toLowerCase(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showNotification('Status updated!', 'success');
        loadAmbulances();
    }).catch(error => {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'error');
    });
}

function deleteAmbulance(ambulanceId) {
    if (!confirm('Are you sure you want to delete this ambulance?')) return;
    
    db.collection('ambulances').doc(ambulanceId).delete().then(() => {
        showNotification('Ambulance deleted', 'success');
        loadAmbulances();
    }).catch(error => {
        console.error('Error deleting ambulance:', error);
        showNotification('Error deleting ambulance', 'error');
    });
}

window.updateAmbulanceStatus = updateAmbulanceStatus;
window.deleteAmbulance = deleteAmbulance;

// ==========================================
// DOCTORS
// ==========================================
async function loadDoctors() {
    const tbody = document.getElementById('doctorsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    
    try {
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        
        if (doctorsSnap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No doctors found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        doctorsSnap.forEach(doc => {
            const doctor = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doctor.doctorName || 'N/A'}</td>
                <td>${doctor.specialization || 'General'}</td>
                <td>${doctor.phone || doctor.email || 'N/A'}</td>
                <td><span class="status-badge available">Active</span></td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading doctors:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading doctors</td></tr>';
    }
}

// ==========================================
// APPOINTMENTS
// ==========================================
async function loadAppointments() {
    const tbody = document.getElementById('appointmentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    
    try {
        const appointmentsSnap = await db.collection('appointments')
            .where('hospitalId', '==', currentHospitalId)
            .orderBy('appointmentDate', 'desc')
            .limit(50)
            .get();
        
        if (appointmentsSnap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No appointments found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        appointmentsSnap.forEach(doc => {
            const apt = doc.data();
            const date = apt.appointmentDate?.toDate();
            const dateStr = date ? 
                date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${apt.patientName || 'N/A'}</td>
                <td>Dr. ${apt.doctorName || 'N/A'}</td>
                <td>${dateStr}</td>
                <td><span class="status-badge available">${apt.status || 'Confirmed'}</span></td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading appointments</td></tr>';
    }
}

// ==========================================
// SETTINGS
// ==========================================
async function loadSettings() {
    try {
        const hospitalDoc = await db.collection('hospitals').doc(currentHospitalId).get();
        
        if (hospitalDoc.exists) {
            const data = hospitalDoc.data();
            document.getElementById('hospitalNameInput').value = data.hospitalName || '';
            document.getElementById('hospitalAddress').value = data.address || '';
            document.getElementById('hospitalPhone').value = data.phone || '';
            document.getElementById('emergencyPhone').value = data.emergencyPhone || '';
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

document.getElementById('hospitalInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        await db.collection('hospitals').doc(currentHospitalId).update({
            hospitalName: document.getElementById('hospitalNameInput').value,
            address: document.getElementById('hospitalAddress').value,
            phone: document.getElementById('hospitalPhone').value,
            emergencyPhone: document.getElementById('emergencyPhone').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Settings saved successfully!', 'success');
        document.getElementById('hospitalName').textContent = document.getElementById('hospitalNameInput').value;
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
});

// ==========================================
// LOGOUT - FIXED
// ==========================================
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        
        // Clear browser history and redirect
        window.location.replace('index.html');
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
});


// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function getTimeAgo(date) {
    if (!date) return 'Just now';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hrs ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

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

console.log('Dashboard script loaded successfully');
