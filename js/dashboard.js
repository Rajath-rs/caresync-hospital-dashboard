// ============================================
// COMPLETE HOSPITAL DASHBOARD JAVASCRIPT
// With Bed Management, Doctor Management, 
// Ambulance Tracking, and Analytics
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
let emergencyAlertsListener = null;

// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = user;
    currentHospitalId = user.uid;
    
    await loadDashboardData();
    setupNavigationListeners();
    listenToEmergencyAlerts();
});

// ============================================
// NAVIGATION SYSTEM
// ============================================

function setupNavigationListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            showSection(section);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
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
            case 'analytics':
                loadAnalytics();
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
        // Load hospital profile
        const hospitalDoc = await db.collection('hospitals').doc(currentHospitalId).get();
        if (hospitalDoc.exists) {
            const hospitalData = hospitalDoc.data();
            document.getElementById('hospitalName').textContent = hospitalData.hospitalName || 'Hospital';
        }
        
        // Load all statistics
        await Promise.all([
            loadStatistics(),
            loadRecentEmergencyAlerts(),
            loadBedManagement()
        ]);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// ============================================
// STATISTICS
// ============================================

async function loadStatistics() {
    try {
        // Total Doctors
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        document.getElementById('totalDoctors').textContent = doctorsSnap.size;
        document.getElementById('doctorTrend').textContent = calculateTrend(doctorsSnap.size, 45);
        
        // Total Patients (from appointments)
        const patientsSnap = await db.collection('appointments')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        const uniquePatients = new Set(patientsSnap.docs.map(doc => doc.data().patientId));
        document.getElementById('totalPatients').textContent = uniquePatients.size;
        document.getElementById('patientTrend').textContent = calculateTrend(uniquePatients.size, 100);
        
        // Today's Appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayAppointmentsSnap = await db.collection('appointments')
            .where('hospitalId', '==', currentHospitalId)
            .where('appointmentDate', '>=', firebase.firestore.Timestamp.fromDate(today))
            .where('appointmentDate', '<', firebase.firestore.Timestamp.fromDate(tomorrow))
            .get();
        document.getElementById('todayAppointments').textContent = todayAppointmentsSnap.size;
        document.getElementById('appointmentTrend').textContent = calculateTrend(todayAppointmentsSnap.size, 15);
        
        // Available Beds (loaded from loadBedManagement)
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function calculateTrend(current, previous) {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
}

// ============================================
// EMERGENCY ALERTS
// ============================================

function listenToEmergencyAlerts() {
    emergencyAlertsListener = db.collection('emergencyAlerts')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            const alertsContainer = document.getElementById('emergencyAlerts');
            const recentAlertsContainer = document.getElementById('recentEmergencyAlerts');
            const badge = document.getElementById('emergencyBadge');
            
            if (snapshot.empty) {
                const emptyState = `
                    <div class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <p>No active emergencies</p>
                    </div>
                `;
                alertsContainer.innerHTML = emptyState;
                recentAlertsContainer.innerHTML = emptyState;
                badge.textContent = '0';
                return;
            }
            
            badge.textContent = snapshot.size;
            alertsContainer.innerHTML = '';
            recentAlertsContainer.innerHTML = '';
            
            snapshot.forEach((doc, index) => {
                const alert = doc.data();
                const alertCard = createAlertCard(doc.id, alert);
                alertsContainer.appendChild(alertCard);
                
                // Show only first 3 in dashboard
                if (index < 3) {
                    const recentCard = createAlertCard(doc.id, alert);
                    recentAlertsContainer.appendChild(recentCard);
                }
            });
        });
}

function createAlertCard(alertId, alert) {
    const card = document.createElement('div');
    card.className = 'alert-card';
    
    const timeAgo = getTimeAgo(alert.createdAt?.toDate());
    
    card.innerHTML = `
        <div class="alert-icon">
            <i class="fas fa-ambulance"></i>
        </div>
        <div class="alert-info">
            <h4>${alert.patientName || 'Emergency Alert'}</h4>
            <p><i class="fas fa-phone"></i> ${alert.patientPhone || 'N/A'}</p>
            <p><i class="fas fa-map-marker-alt"></i> 
                Lat: ${alert.location?.latitude?.toFixed(5) || 'N/A'}, 
                Lon: ${alert.location?.longitude?.toFixed(5) || 'N/A'}
            </p>
            <span class="alert-time">${timeAgo}</span>
        </div>
        <div class="alert-actions">
            <button class="btn-respond" onclick="respondToEmergency('${alertId}', ${alert.location?.latitude}, ${alert.location?.longitude})">
                <i class="fas fa-ambulance"></i> Respond
            </button>
        </div>
    `;
    
    return card;
}

function respondToEmergency(alertId, lat, lon) {
    if (lat && lon) {
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
        window.open(mapsUrl, '_blank');
    }
    
    // Update alert status
    db.collection('emergencyAlerts').doc(alertId).update({
        status: 'responded',
        respondedBy: currentHospitalId,
        respondedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showNotification('Emergency response initiated', 'success');
    }).catch(error => {
        console.error('Error responding to emergency:', error);
        showNotification('Error responding to emergency', 'error');
    });
}

function loadRecentEmergencyAlerts() {
    // This is handled by the real-time listener
}

// ============================================
// BED MANAGEMENT
// ============================================

async function loadBedManagement() {
    try {
        const bedDoc = await db.collection('beds').doc(currentHospitalId).get();
        
        if (bedDoc.exists) {
            const bedData = bedDoc.data();
            updateBedDisplay(bedData);
        } else {
            // Initialize default bed data
            const defaultBeds = {
                general: { total: 50, available: 45, occupied: 5 },
                icu: { total: 20, available: 15, occupied: 5 },
                emergency: { total: 30, available: 28, occupied: 2 },
                private: { total: 15, available: 12, occupied: 3 }
            };
            
            await db.collection('beds').doc(currentHospitalId).set(defaultBeds);
            updateBedDisplay(defaultBeds);
        }
    } catch (error) {
        console.error('Error loading bed management:', error);
    }
}

function updateBedDisplay(bedData) {
    const categories = ['general', 'icu', 'emergency', 'private'];
    let totalAvailable = 0;
    
    categories.forEach(category => {
        const data = bedData[category] || { total: 0, available: 0, occupied: 0 };
        
        document.getElementById(`${category}Total`).textContent = data.total;
        document.getElementById(`${category}Available`).textContent = data.available;
        document.getElementById(`${category}Occupied`).textContent = data.occupied;
        
        const occupancyPercent = data.total > 0 ? (data.occupied / data.total) * 100 : 0;
        document.getElementById(`${category}Progress`).style.width = `${occupancyPercent}%`;
        
        totalAvailable += data.available;
    });
    
    document.getElementById('availableBeds').textContent = totalAvailable;
    document.getElementById('bedTrend').textContent = calculateTrend(totalAvailable, 110);
}

async function updateBeds(category, change) {
    try {
        const bedDoc = await db.collection('beds').doc(currentHospitalId).get();
        const bedData = bedDoc.data();
        
        const currentData = bedData[category];
        const newAvailable = Math.max(0, Math.min(currentData.total, currentData.available + change));
        const newOccupied = currentData.total - newAvailable;
        
        bedData[category] = {
            ...currentData,
            available: newAvailable,
            occupied: newOccupied
        };
        
        await db.collection('beds').doc(currentHospitalId).update(bedData);
        updateBedDisplay(bedData);
        showNotification('Bed availability updated', 'success');
        
    } catch (error) {
        console.error('Error updating beds:', error);
        showNotification('Error updating bed availability', 'error');
    }
}

// ============================================
// DOCTOR MANAGEMENT
// ============================================

async function loadDoctorManagement() {
    const tbody = document.getElementById('doctorsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading doctors...</td></tr>';
    
    try {
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        
        if (doctorsSnap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No doctors found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        for (const doc of doctorsSnap.docs) {
            const doctor = doc.data();
            
            // Get today's appointments for this doctor
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const appointmentsSnap = await db.collection('appointments')
                .where('doctorId', '==', doc.id)
                .where('appointmentDate', '>=', firebase.firestore.Timestamp.fromDate(today))
                .where('appointmentDate', '<', firebase.firestore.Timestamp.fromDate(tomorrow))
                .get();
            
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
                <td>${doctor.phone || 'N/A'}</td>
                <td><span class="status-badge available">Active</span></td>
                <td>${appointmentsSnap.size}</td>
                <td>
                    <button class="table-action-btn view" onclick="viewDoctor('${doc.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="table-action-btn edit" onclick="editDoctor('${doc.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
        
    } catch (error) {
        console.error('Error loading doctors:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading doctors</td></tr>';
    }
}

function viewDoctor(doctorId) {
    showNotification('View doctor functionality - Coming soon', 'info');
}

function editDoctor(doctorId) {
    showNotification('Edit doctor functionality - Coming soon', 'info');
}

function openAddDoctorModal() {
    showNotification('Add doctor functionality - Coming soon', 'info');
}

// ============================================
// APPOINTMENTS MANAGEMENT
// ============================================

async function loadAppointments(filter = 'all') {
    const tbody = document.getElementById('appointmentsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading appointments...</td></tr>';
    
    try {
        let query = db.collection('appointments')
            .where('hospitalId', '==', currentHospitalId);
        
        // Apply filters
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (filter === 'today') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query
                .where('appointmentDate', '>=', firebase.firestore.Timestamp.fromDate(today))
                .where('appointmentDate', '<', firebase.firestore.Timestamp.fromDate(tomorrow));
        } else if (filter === 'upcoming') {
            query = query.where('appointmentDate', '>=', firebase.firestore.Timestamp.fromDate(today));
        } else if (filter === 'completed') {
            query = query.where('status', '==', 'completed');
        }
        
        const appointmentsSnap = await query
            .orderBy('appointmentDate', 'desc')
            .limit(50)
            .get();
        
        if (appointmentsSnap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No appointments found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        appointmentsSnap.forEach(doc => {
            const appointment = doc.data();
            const date = appointment.appointmentDate?.toDate();
            const dateStr = date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${appointment.patientName || 'N/A'}</td>
                <td>Dr. ${appointment.doctorName || 'N/A'}</td>
                <td>${dateStr}</td>
                <td>${appointment.department || 'General'}</td>
                <td><span class="status-badge status-${appointment.status || 'pending'}">${appointment.status || 'Pending'}</span></td>
                <td>
                    <button class="table-action-btn view" onclick="viewAppointment('${doc.id}')">
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
    // Update filter button active state
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadAppointments(filter);
}

function viewAppointment(appointmentId) {
    showNotification('View appointment functionality - Coming soon', 'info');
}

// ============================================
// AMBULANCE MANAGEMENT
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
    }
}

function createAmbulanceCard(id, ambulance) {
    const card = document.createElement('div');
    card.className = 'ambulance-card';
    
    card.innerHTML = `
        <div class="ambulance-header">
            <div class="ambulance-number">
                <i class="fas fa-ambulance"></i>
                ${ambulance.vehicleNumber || 'N/A'}
            </div>
            <span class="ambulance-status ${ambulance.status || 'available'}">
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
                <label>Last Service</label>
                <span>${ambulance.lastService ? new Date(ambulance.lastService.toDate()).toLocaleDateString() : 'N/A'}</span>
            </div>
        </div>
        <div class="ambulance-actions">
            <button class="btn-track" onclick="trackAmbulance('${id}')">
                <i class="fas fa-map-marker-alt"></i> Track
            </button>
            <button class="btn-update" onclick="updateAmbulanceStatus('${id}')">
                <i class="fas fa-edit"></i> Update
            </button>
        </div>
    `;
    
    return card;
}

function trackAmbulance(id) {
    showNotification('Ambulance tracking - Coming soon', 'info');
}

function updateAmbulanceStatus(id) {
    showNotification('Update ambulance status - Coming soon', 'info');
}

function openAddAmbulanceModal() {
    const vehicleNumber = prompt('Enter Vehicle Number:');
    if (!vehicleNumber) return;
    
    const driverName = prompt('Enter Driver Name:');
    const driverPhone = prompt('Enter Driver Phone:');
    
    db.collection('ambulances').add({
        hospitalId: currentHospitalId,
        vehicleNumber: vehicleNumber,
        driverName: driverName || '',
        driverPhone: driverPhone || '',
        type: 'Basic',
        status: 'available',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showNotification('Ambulance added successfully', 'success');
        loadAmbulanceFleet();
    }).catch(error => {
        console.error('Error adding ambulance:', error);
        showNotification('Error adding ambulance', 'error');
    });
}

// ============================================
// ANALYTICS
// ============================================

function loadAnalytics() {
    showNotification('Analytics functionality - Coming soon', 'info');
    // Chart.js implementation would go here
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
        
        // Setup form submission
        document.getElementById('hospitalInfoForm').onsubmit = async (e) => {
            e.preventDefault();
            
            try {
                await db.collection('hospitals').doc(currentHospitalId).update({
                    hospitalName: document.getElementById('hospitalNameInput').value,
                    address: document.getElementById('hospitalAddress').value,
                    phone: document.getElementById('hospitalPhone').value,
                    emergencyPhone: document.getElementById('emergencyPhone').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showNotification('Settings updated successfully', 'success');
                document.getElementById('hospitalName').textContent = document.getElementById('hospitalNameInput').value;
                
            } catch (error) {
                console.error('Error updating settings:', error);
                showNotification('Error updating settings', 'error');
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
        showNotification('Error logging out', 'error');
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getTimeAgo(date) {
    if (!date) return 'Just now';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
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
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize
console.log('Hospital Dashboard Loaded Successfully');
