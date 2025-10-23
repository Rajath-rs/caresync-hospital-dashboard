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

    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    try {
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentHospitalId)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (doctorsSnap.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-user-md"></i>
                            <p>No doctors found</p>
                            <button class="btn-primary" onclick="openDoctorModal()">
                                <i class="fas fa-plus"></i> Add First Doctor
                            </button>
                        </div>
                    </td>
                </tr>`;
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
                <td>${doctor.hfrNumber || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editDoctor('${doc.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteDoctor('${doc.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading doctors:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading doctors</td></tr>';
    }
}

// Open Doctor Modal
let editingDoctorId = null;

function openDoctorModal(doctorId = null) {
    editingDoctorId = doctorId;
    const modal = document.getElementById('doctorModal');
    const title = document.getElementById('doctorModalTitle');
    const form = document.getElementById('doctorForm');
    
    form.reset();
    
    if (doctorId) {
        title.textContent = 'Edit Doctor';
        // Load doctor data
        db.collection('doctors').doc(doctorId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('doctorName').value = data.doctorName || '';
                document.getElementById('doctorSpecialization').value = data.specialization || '';
                document.getElementById('doctorPhone').value = data.phone || '';
                document.getElementById('doctorEmail').value = data.email || '';
                document.getElementById('doctorHFR').value = data.hfrNumber || '';
            }
        });
    } else {
        title.textContent = 'Add New Doctor';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDoctorModal() {
    const modal = document.getElementById('doctorModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    editingDoctorId = null;
    document.getElementById('doctorForm').reset();
}

// Doctor Form Submission
document.getElementById('doctorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const doctorData = {
        doctorName: document.getElementById('doctorName').value.trim(),
        specialization: document.getElementById('doctorSpecialization').value.trim(),
        phone: document.getElementById('doctorPhone').value.trim(),
        email: document.getElementById('doctorEmail').value.trim(),
        hfrNumber: document.getElementById('doctorHFR').value.trim(),
        hospitalId: currentHospitalId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (editingDoctorId) {
            // Update existing doctor
            await db.collection('doctors').doc(editingDoctorId).update(doctorData);
            showNotification('Doctor updated successfully!', 'success');
        } else {
            // Add new doctor
            doctorData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('doctors').add(doctorData);
            showNotification('Doctor added successfully!', 'success');
        }
        
        closeDoctorModal();
        await loadDoctors();
        await loadStatistics(); // Update stats
        
    } catch (error) {
        console.error('Error saving doctor:', error);
        showNotification('Error: ' + error.message, 'error');
    }
});

// Edit Doctor
function editDoctor(doctorId) {
    openDoctorModal(doctorId);
}

// Delete Doctor
async function deleteDoctor(doctorId) {
    if (!confirm('Are you sure you want to delete this doctor?')) return;
    
    try {
        await db.collection('doctors').doc(doctorId).delete();
        showNotification('Doctor deleted successfully!', 'success');
        await loadDoctors();
        await loadStatistics();
    } catch (error) {
        console.error('Error deleting doctor:', error);
        showNotification('Error deleting doctor', 'error');
    }
}

window.openDoctorModal = openDoctorModal;
window.closeDoctorModal = closeDoctorModal;
window.editDoctor = editDoctor;
window.deleteDoctor = deleteDoctor;

// ==========================================
// APPOINTMENTS
// ==========================================
async function loadAppointments() {
    const tbody = document.getElementById('appointmentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    
    try {
        const appointmentsSnap = await db.collection('appointments')
            .where('hospitalId', '==', currentHospitalId)
            .orderBy('appointmentDate', 'desc')
            .limit(50)
            .get();
        
        if (appointmentsSnap.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-calendar-check"></i>
                            <p>No appointments found</p>
                            <button class="btn-primary" onclick="openAppointmentModal()">
                                <i class="fas fa-plus"></i> Add First Appointment
                            </button>
                        </div>
                    </td>
                </tr>`;
            return;
        }
        
        tbody.innerHTML = '';
        appointmentsSnap.forEach(doc => {
            const apt = doc.data();
            const date = apt.appointmentDate?.toDate();
            const dateStr = date ? 
                `${date.toLocaleDateString()} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 
                'N/A';
            
            const statusClass = apt.status === 'confirmed' ? 'success' : 
                               apt.status === 'cancelled' ? 'danger' : 'warning';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${apt.patientName || 'N/A'}</td>
                <td>Dr. ${apt.doctorName || 'N/A'}</td>
                <td>${dateStr}</td>
                <td>${apt.reason || 'General Checkup'}</td>
                <td><span class="status-badge ${statusClass}">${apt.status || 'Pending'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editAppointment('${doc.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteAppointment('${doc.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading appointments</td></tr>';
    }
}

// Open Appointment Modal
let editingAppointmentId = null;

async function openAppointmentModal(appointmentId = null) {
    editingAppointmentId = appointmentId;
    const modal = document.getElementById('appointmentModal');
    const title = document.getElementById('appointmentModalTitle');
    const form = document.getElementById('appointmentForm');
    
    form.reset();
    
    // Load doctors for dropdown
    await loadDoctorsDropdown();
    
    if (appointmentId) {
        title.textContent = 'Edit Appointment';
        db.collection('appointments').doc(appointmentId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('aptPatientName').value = data.patientName || '';
                document.getElementById('aptDoctorId').value = data.doctorId || '';
                document.getElementById('aptDate').value = data.appointmentDate ? 
                    new Date(data.appointmentDate.toDate()).toISOString().slice(0, 16) : '';
                document.getElementById('aptReason').value = data.reason || '';
                document.getElementById('aptStatus').value = data.status || 'pending';
            }
        });
    } else {
        title.textContent = 'Add New Appointment';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    editingAppointmentId = null;
    document.getElementById('appointmentForm').reset();
}

// Load Doctors for Dropdown
async function loadDoctorsDropdown() {
    const select = document.getElementById('aptDoctorId');
    if (!select) return;
    
    try {
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentHospitalId)
            .get();
        
        select.innerHTML = '<option value="">Select Doctor</option>';
        doctorsSnap.forEach(doc => {
            const doctor = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `Dr. ${doctor.doctorName} - ${doctor.specialization || 'General'}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading doctors dropdown:', error);
    }
}

// Appointment Form Submission
document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const doctorId = document.getElementById('aptDoctorId').value;
    const dateStr = document.getElementById('aptDate').value;
    
    if (!doctorId) {
        showNotification('Please select a doctor', 'error');
        return;
    }
    
    // Get doctor details
    const doctorDoc = await db.collection('doctors').doc(doctorId).get();
    const doctorName = doctorDoc.exists ? doctorDoc.data().doctorName : 'Unknown';
    
    const appointmentData = {
        patientName: document.getElementById('aptPatientName').value.trim(),
        doctorId: doctorId,
        doctorName: doctorName,
        appointmentDate: firebase.firestore.Timestamp.fromDate(new Date(dateStr)),
        reason: document.getElementById('aptReason').value.trim(),
        status: document.getElementById('aptStatus').value,
        hospitalId: currentHospitalId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (editingAppointmentId) {
            await db.collection('appointments').doc(editingAppointmentId).update(appointmentData);
            showNotification('Appointment updated successfully!', 'success');
        } else {
            appointmentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('appointments').add(appointmentData);
            showNotification('Appointment created successfully!', 'success');
        }
        
        closeAppointmentModal();
        await loadAppointments();
        await loadStatistics();
        
    } catch (error) {
        console.error('Error saving appointment:', error);
        showNotification('Error: ' + error.message, 'error');
    }
});

// Edit Appointment
function editAppointment(appointmentId) {
    openAppointmentModal(appointmentId);
}

// Delete Appointment
async function deleteAppointment(appointmentId) {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
        await db.collection('appointments').doc(appointmentId).delete();
        showNotification('Appointment deleted successfully!', 'success');
        await loadAppointments();
        await loadStatistics();
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showNotification('Error deleting appointment', 'error');
    }
}

window.openAppointmentModal = openAppointmentModal;
window.closeAppointmentModal = closeAppointmentModal;
window.editAppointment = editAppointment;
window.deleteAppointment = deleteAppointment;

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
