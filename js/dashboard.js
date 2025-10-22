// ============================================
// FIXED HOSPITAL DASHBOARD JAVASCRIPT
// All controls now working properly
// ============================================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBnqbxn9N4J1lOOh7pDP7StcTfuM16mBTs",
    authDomain: "caresync-2e5d4.firebaseapp.com",
    projectId: "caresync-2e5d4",
    storageBucket: "caresync-2e5d4.firebasestorage.app",
    messagingSenderId: "588308758613",
    appId: "1:588308758613:web:af393fd9804841cce294dc",
    measurementId: "G-WQF201CXDY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentHospitalId = null;

// ============================================
// AUTHENTICATION
// ============================================

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = user;
    currentHospitalId = user.uid;
    
    await initializeDashboard();
});

async function initializeDashboard() {
    try {
        // Load hospital profile
        const hospitalDoc = await db.collection('hospitals').doc(currentHospitalId).get();
        if (hospitalDoc.exists) {
            const hospitalData = hospitalDoc.data();
            document.getElementById('hospitalName').textContent = hospitalData.hospitalName || 'Hospital';
        }
        
        // Initialize bed data if doesn't exist
        await initializeBedData();
        
        // Load all dashboard data
        await loadDashboardData();
        setupNavigationListeners();
        listenToEmergencyAlerts();
        
        console.log('Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard: ' + error.message, 'error');
    }
}

// ============================================
// BED DATA INITIALIZATION
// ============================================

async function initializeBedData() {
    try {
        const bedDoc = await db.collection('beds').doc(currentHospitalId).get();
        
        if (!bedDoc.exists) {
            // Create default bed structure
            const defaultBeds = {
                hospitalId: currentHospitalId,
                general: { 
                    total: 50, 
                    available: 45, 
                    occupied: 5,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                },
                icu: { 
                    total: 20, 
                    available: 15, 
                    occupied: 5,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                },
                emergency: { 
                    total: 30, 
                    available: 28, 
                    occupied: 2,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                },
                private: { 
                    total: 15, 
                    available: 12, 
                    occupied: 3,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('beds').doc(currentHospitalId).set(defaultBeds);
            console.log('Default bed data initialized');
        }
    } catch (error) {
        console.error('Error initializing bed data:', error);
        throw error;
    }
}

// ============================================
// NAVIGATION
// ============================================

function setupNavigationListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            if (section) {
                showSection(section);
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        switch(sectionName) {
            case 'beds':
                loadBedManagement();
                break;
            case 'doctors':
                loadDoctorManagement();
                break;
            case 'appointments':
                loadAppointments();
                break;
            case 'ambulance':
                loadAmbulanceFleet();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    }
}

// ============================================
// DASHBOARD DATA LOADING
// ============================================

async function loadDashboardData() {
    try {
        await Promise.all([
            loadStatistics(),
            loadBedManagement()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadStatistics() {
    try {
        // Load doctors count
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        document.getElementById('totalDoctors').textContent = doctorsSnap.size;
        
        // Load patients from appointments
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

// ============================================
// BED MANAGEMENT - FIXED
// ============================================

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
        console.error('Error loading bed management:', error);
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
            progressElem.style.width = `${occupancyPercent}%`;
        }
        
        totalAvailable += data.available;
    });
    
    const availableBedsElem = document.getElementById('availableBeds');
    if (availableBedsElem) {
        availableBedsElem.textContent = totalAvailable;
    }
}

// FIXED: Bed Update Function
async function updateBeds(category, change) {
    try {
        console.log(`Updating ${category} beds by ${change}`);
        
        const bedDocRef = db.collection('beds').doc(currentHospitalId);
        const bedDoc = await bedDocRef.get();
        
        if (!bedDoc.exists) {
            showNotification('Bed data not found. Initializing...', 'warning');
            await initializeBedData();
            return;
        }
        
        const bedData = bedDoc.data();
        const currentData = bedData[category];
        
        if (!currentData) {
            showNotification('Invalid bed category', 'error');
            return;
        }
        
        // Calculate new values
        let newAvailable = currentData.available + change;
        
        // Validate bounds
        if (newAvailable < 0) {
            showNotification('Available beds cannot be negative', 'error');
            return;
        }
        
        if (newAvailable > currentData.total) {
            showNotification('Available beds cannot exceed total beds', 'error');
            return;
        }
        
        const newOccupied = currentData.total - newAvailable;
        
        // Update Firebase
        const updateData = {};
        updateData[`${category}.available`] = newAvailable;
        updateData[`${category}.occupied`] = newOccupied;
        updateData[`${category}.lastUpdated`] = firebase.firestore.FieldValue.serverTimestamp();
        
        await bedDocRef.update(updateData);
        
        // Update display
        bedData[category] = {
            ...currentData,
            available: newAvailable,
            occupied: newOccupied
        };
        updateBedDisplay(bedData);
        
        showNotification(`${category.toUpperCase()} beds updated successfully`, 'success');
        
    } catch (error) {
        console.error('Error updating beds:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Function to add total beds
async function addTotalBeds(category) {
    const newTotal = prompt(`Enter new total for ${category} beds:`, '0');
    if (!newTotal) return;
    
    const total = parseInt(newTotal);
    if (isNaN(total) || total < 0) {
        showNotification('Please enter a valid number', 'error');
        return;
    }
    
    try {
        const bedDocRef = db.collection('beds').doc(currentHospitalId);
        const updateData = {};
        updateData[`${category}.total`] = total;
        updateData[`${category}.available`] = total;
        updateData[`${category}.occupied`] = 0;
        
        await bedDocRef.update(updateData);
        await loadBedManagement();
        showNotification('Total beds updated', 'success');
    } catch (error) {
        console.error('Error adding total beds:', error);
        showNotification('Error updating total beds', 'error');
    }
}

// ============================================
// EMERGENCY ALERTS
// ============================================

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
                    recentAlertsContainer.appendChild(alertCard);
                }
            });
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
            <p><i class="fas fa-map-marker-alt"></i> ${alert.location ? `Lat: ${alert.location.latitude.toFixed(4)}, Lon: ${alert.location.longitude.toFixed(4)}` : 'Location unavailable'}</p>
            <span class="alert-time">${timeAgo}</span>
        </div>
        <div class="alert-actions">
            <button class="btn-respond" onclick="respondToEmergency('${alertId}', ${alert.location?.latitude}, ${alert.location?.longitude})">
                <i class="fas fa-route"></i> Navigate
            </button>
        </div>
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
        });
    } else {
        showNotification('Location not available', 'error');
    }
}

// ============================================
// AMBULANCE MANAGEMENT - COMPLETE
// ============================================

async function loadAmbulanceFleet() {
    try {
        const ambulanceSnap = await db.collection('ambulances')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        
        // Update stats
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
        
        // Display ambulance list
        const ambulanceList = document.getElementById('ambulanceList');
        
        if (ambulanceSnap.empty) {
            ambulanceList.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-ambulance"></i>
                    <p>No ambulances registered</p>
                    <button class="btn-primary" onclick="openAddAmbulanceModal()">
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
        console.error('Error loading ambulance fleet:', error);
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
            <button class="btn-track" onclick="changeAmbulanceStatus('${id}')">
                <i class="fas fa-sync"></i> Change Status
            </button>
            <button class="btn-update" onclick="deleteAmbulance('${id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

function openAddAmbulanceModal() {
    const vehicleNumber = prompt('Enter Vehicle Number (e.g., KA-01-AB-1234):');
    if (!vehicleNumber || vehicleNumber.trim() === '') {
        showNotification('Vehicle number is required', 'error');
        return;
    }
    
    const driverName = prompt('Enter Driver Name:');
    const driverPhone = prompt('Enter Driver Phone Number:');
    const type = prompt('Enter Ambulance Type (Basic/Advanced/ICU):', 'Basic');
    
    db.collection('ambulances').add({
        hospitalId: currentHospitalId,
        vehicleNumber: vehicleNumber.trim(),
        driverName: driverName?.trim() || '',
        driverPhone: driverPhone?.trim() || '',
        type: type?.trim() || 'Basic',
        status: 'available',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showNotification('Ambulance added successfully!', 'success');
        loadAmbulanceFleet();
    }).catch(error => {
        console.error('Error adding ambulance:', error);
        showNotification('Error adding ambulance: ' + error.message, 'error');
    });
}

function changeAmbulanceStatus(ambulanceId) {
    const newStatus = prompt('Enter new status (available/on-duty/maintenance):');
    if (!newStatus) return;
    
    const validStatuses = ['available', 'on-duty', 'maintenance'];
    if (!validStatuses.includes(newStatus.toLowerCase())) {
        showNotification('Invalid status. Use: available, on-duty, or maintenance', 'error');
        return;
    }
    
    db.collection('ambulances').doc(ambulanceId).update({
        status: newStatus.toLowerCase(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showNotification('Ambulance status updated!', 'success');
        loadAmbulanceFleet();
    }).catch(error => {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'error');
    });
}

function deleteAmbulance(ambulanceId) {
    if (!confirm('Are you sure you want to delete this ambulance?')) return;
    
    db.collection('ambulances').doc(ambulanceId).delete().then(() => {
        showNotification('Ambulance deleted successfully', 'success');
        loadAmbulanceFleet();
    }).catch(error => {
        console.error('Error deleting ambulance:', error);
        showNotification('Error deleting ambulance', 'error');
    });
}

// ============================================
// DOCTOR MANAGEMENT
// ============================================

async function loadDoctorManagement() {
    const tbody = document.getElementById('doctorsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading doctors...</td></tr>';
    
    try {
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        
        if (doctorsSnap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No doctors found. Doctors will appear here when they register.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        doctorsSnap.forEach(doc => {
            const doctor = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.doctorName || 'Doctor')}&background=4F46E5&color=fff" 
                             style="width: 40px; height: 40px; border-radius: 50%;" alt="Doctor">
                        <strong>${doctor.doctorName || 'N/A'}</strong>
                    </div>
                </td>
                <td>${doctor.specialization || 'General'}</td>
                <td>${doctor.phone || doctor.email || 'N/A'}</td>
                <td><span class="status-badge available">Active</span></td>
                <td>0</td>
                <td>
                    <button class="table-action-btn view">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading doctors:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading doctors</td></tr>';
    }
}

// ============================================
// APPOINTMENTS
// ============================================

async function loadAppointments(filter = 'all') {
    const tbody = document.getElementById('appointmentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading appointments...</td></tr>';
    
    try {
        const appointmentsSnap = await db.collection('appointments')
            .where('hospitalId', '==', currentHospitalId)
            .orderBy('appointmentDate', 'desc')
            .limit(50)
            .get();
        
        if (appointmentsSnap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No appointments found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        appointmentsSnap.forEach(doc => {
            const apt = doc.data();
            const date = apt.appointmentDate?.toDate();
            const dateStr = date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${apt.patientName || 'N/A'}</td>
                <td>Dr. ${apt.doctorName || 'N/A'}</td>
                <td>${dateStr}</td>
                <td>${apt.department || 'General'}</td>
                <td><span class="status-badge status-confirmed">${apt.status || 'Confirmed'}</span></td>
                <td>
                    <button class="table-action-btn view">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading appointments</td></tr>';
    }
}

function filterAppointments(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadAppointments(filter);
}

// ============================================
// SETTINGS
// ============================================

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
        
        document.getElementById('hospitalInfoForm').onsubmit = async (e) => {
            e.preventDefault();
            
            try {
                await db.collection('hospitals').doc(currentHospitalId).update({
                    hospitalName: document.getElementById('hospitalNameInput').value,
                    address: document.getElementById('hospitalAddress').value,
                    phone: document.getElementById('hospitalPhone').value,
                    emergencyPhone: document.getElementById('emergencyPhone').value
                });
                
                showNotification('Settings saved successfully!', 'success');
                document.getElementById('hospitalName').textContent = document.getElementById('hospitalNameInput').value;
                
            } catch (error) {
                console.error('Error saving settings:', error);
                showNotification('Error saving settings', 'error');
            }
        };
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// ============================================
// LOGOUT
// ============================================

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Make functions globally accessible
window.updateBeds = updateBeds;
window.addTotalBeds = addTotalBeds;
window.openAddAmbulanceModal = openAddAmbulanceModal;
window.changeAmbulanceStatus = changeAmbulanceStatus;
window.deleteAmbulance = deleteAmbulance;
window.respondToEmergency = respondToEmergency;
window.showSection = showSection;
window.filterAppointments = filterAppointments;

console.log('Dashboard script loaded successfully');
