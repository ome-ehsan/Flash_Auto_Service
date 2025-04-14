// Form validation 
document.addEventListener('DOMContentLoaded', ()=> {
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
      appointmentForm.addEventListener('submit', function(event) {
        // get elements
        const clientName = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        //const address = document.getElementById('address').value.trim();
        const carLicense = document.getElementById('carLicense').value.trim();
        const carEngine = document.getElementById('carEngine').value.trim();
        const appointmentDate = document.getElementById('appointmentDate').value;
        const mechanicId = document.getElementById('mechanicId').value;
        
        let isValid = true;
        let errorMessage = '';
        
        // name validation
        if (!/^[A-Za-z\s]+$/.test(clientName)) {
          errorMessage = 'Name should contain only letters and spaces';
          isValid = false;
        }
        
        // phone validation
        if (!/^\d+$/.test(phone)) {
          errorMessage = 'Phone number should contain only digits';
          isValid = false;
        }
        
        // car license validation
        if (!/^[A-Za-z0-9\-\s]+$/.test(carLicense)) {
          errorMessage = 'Car license number should contain only letters, numbers, spaces, and hyphens';
          isValid = false;
        }
        
        // car engine validation
        if (!/^[A-Za-z0-9\-]+$/.test(carEngine)) {
          errorMessage = 'Car engine number should contain only letters, numbers, and hyphens';
          isValid = false;
        }
        
        // appointment validation, can only be future or curr date 
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(appointmentDate);
        selectedDate.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          errorMessage = 'Appointment date cannot be in the past';
          isValid = false;
        }
        
        // Validate mechanic selection
        if (!mechanicId) {
          errorMessage = 'Please select a mechanic';
          isValid = false;
        }
        
        // If validation fails,prevent submission
        if (!isValid) {
          event.preventDefault();
          alert(errorMessage);
        }
      });
    }
    
    // Set minimum date for appointment date input
    const appointmentDateInput = document.getElementById('appointmentDate');
    if (appointmentDateInput) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;
      
      appointmentDateInput.setAttribute('min', formattedDate);
    }
  });