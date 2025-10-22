document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const doctorForm = document.getElementById('doctorForm');
    const hospitalForm = document.getElementById('hospitalForm');
    const doctorRegistration = document.getElementById('doctor-registration');
    const hospitalRegistration = document.getElementById('hospital-registration');

    // Tab switching logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.tab === 'doctor') {
                doctorForm.classList.remove('hidden');
                hospitalForm.classList.add('hidden');
            } else {
                hospitalForm.classList.remove('hidden');
                doctorForm.classList.add('hidden');
            }
        });
    });

    // Doctor registration form submission
    doctorRegistration.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const doctorData = {
            name: document.getElementById('doctorName').value,
            email: document.getElementById('doctorEmail').value,
            hpid: document.getElementById('doctorHPID').value,
            specialization: document.getElementById('doctorSpecialization').value
        };

        try {
            const response = await fetch('YOUR_API_ENDPOINT/register-doctor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(doctorData)
            });

            if (response.ok) {
                alert('Doctor registration successful!');
                doctorRegistration.reset();
            } else {
                throw new Error('Registration failed');
            }
        } catch (error) {
            alert('Error registering doctor: ' + error.message);
        }
    });

    // Hospital registration form submission
    hospitalRegistration.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const hospitalData = {
            name: document.getElementById('hospitalName').value,
            email: document.getElementById('hospitalEmail').value,
            hfr: document.getElementById('hospitalHFR').value,
            address: document.getElementById('hospitalAddress').value
        };

        try {
            const response = await fetch('YOUR_API_ENDPOINT/register-hospital', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(hospitalData)
            });

            if (response.ok) {
                alert('Hospital registration successful!');
                hospitalRegistration.reset();
            } else {
                throw new Error('Registration failed');
            }
        } catch (error) {
            alert('Error registering hospital: ' + error.message);
        }
    });

    // Form validation
    function validateHPID(hpid) {
        return /^[a-zA-Z0-9]{12,14}$/.test(hpid);
    }

    function validateHFR(hfr) {
        return /^[a-zA-Z0-9]{12,14}$/.test(hfr);
    }

    document.getElementById('doctorHPID').addEventListener('input', (e) => {
        const isValid = validateHPID(e.target.value);
        e.target.setCustomValidity(isValid ? '' : 'HPID must be 12-14 alphanumeric characters');
    });

    document.getElementById('hospitalHFR').addEventListener('input', (e) => {
        const isValid = validateHFR(e.target.value);
        e.target.setCustomValidity(isValid ? '' : 'HFR must be 12-14 alphanumeric characters');
    });
});