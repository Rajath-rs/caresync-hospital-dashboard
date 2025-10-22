// Initialize Firebase
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let emergencyAlertsListener = null;

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = user;
    loadDashboardData();
    listenToEmergencyAlerts();
});

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load hospital profile
        const hospitalDoc = await db.collection('hospitals').doc(currentUser.uid).get();
        if (hospitalDoc.exists) {
            const hospitalData = hospitalDoc.data();
            document.getElementById('hospitalName').textContent = hospitalData.hospitalName || 'Hospital';
        }
        
        // Load statistics
        loadStatistics();
        loadRecentAppointments();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load Statistics
async function loadStatistics() {
    try {
        // Get total doctors
        const doctorsSnap = await db.collection('doctors')
            .where('hospitalId', '==', currentUser.uid)
            .get();
        document.getElementById('totalDoctors').textContent = doctorsSnap.size;
        
        // Get today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const appointmentsSnap = await db.collection('appointments')
            .where('hospitalId', '==', currentUser.uid)
            .where('appointmentDate', '>=', firebase.firestore.Timestamp.fromDate(today))
            .get();
        document.getElementById('todayAppointments').textContent = appointmentsSnap.size;
        
        // Simulated data (replace with real Firebase queries)
        document.getElementById('totalPatients').textContent = '124';
        document.getElementById('availableBeds').textContent = '32';
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Listen to Emergency Alerts (Real-time)
function listenToEmergencyAlerts() {
    const alertsContainer = document.getElementById('emergencyAlerts');
    const badge = document.getElementById('emergencyBadge');
    
    emergencyAlertsListener = db.collection('emergencyAlerts')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            alertsContainer.innerHTML = '';
            
            if (snapshot.empty) {
                alertsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <p>No active emergencies</p>
                    </div>
                `;
                badge.textContent = '0';
                return;
            }
            
            badge.textContent = snapshot.size;
            
            snapshot.forEach((doc) => {
                const alert = doc.data();
                const alertCard = createAlertCard(doc.id, alert);
                alertsContainer.appendChild(alertCard);
            });
        });
}

// Create Alert Card
function createAlertCard(alertId, alert) {
    const card = document.createElement('div');
    card.className = 'alert-card';
    
    const timeAgo = getTimeAgo(alert.createdAt?.toDate());
    
    card.innerHTML = `
        <div class="alert-icon">
            <i class="fas fa-ambulance"></i>
        </div>
        <div class="alert-info">
            <h4>${alert.patientName}</h4>
            <p><i class="fas fa-phone"></i> ${alert.patientPhone || 'N/A'}</p>
            <p><i class="fas fa-map-marker-alt"></i> 
                Lat: ${alert.location?.latitude?.toFixed(5)}, 
                Lon: ${alert.location?.longitude?.toFixed(5)}
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

// Respond to Emergency
function respondToEmergency(alertId, lat, lon) {
    // Open location in Google Maps
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(mapsUrl, '_blank');
    
    // Update alert status
    db.collection('emergencyAlerts').doc(alertId).update({
        status: 'responded',
        respondedBy: currentUser.uid,
        respondedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Load Recent Appointments
async function loadRecentAppointments() {
    const tbody = document.getElementById('appointmentsBody');
    
    try {
        const appointmentsSnap = await db.collection('appointments')
            .where('hospitalId', '==', currentUser.uid)
            .orderBy('appointmentDate', 'desc')
            .limit(5)
            .get();
        
        if (appointmentsSnap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No appointments found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        appointmentsSnap.forEach((doc) => {
            const appointment = doc.data();
            const row = createAppointmentRow(appointment);
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Create Appointment Row
function createAppointmentRow(appointment) {
    const row = document.createElement('tr');
    const date = appointment.appointmentDate?.toDate();
    const dateStr = date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString() : 'N/A';
    
    row.innerHTML = `
        <td>${appointment.patientName || 'N/A'}</td>
        <td>Dr. ${appointment.doctorName || 'N/A'}</td>
        <td>${dateStr}</td>
        <td><span class="status-badge status-${appointment.status}">${appointment.status}</span></td>
        <td><button class="link-btn">View</button></td>
    `;
    
    return row;
}

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Helper function
function getTimeAgo(date) {
    if (!date) return 'Just now';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}
