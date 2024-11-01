document.addEventListener('DOMContentLoaded', () => {
    // Get userId from localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = '/index.html';
        return;
    }

    const form = document.getElementById('reservationForm');
    const decreaseBtn = document.getElementById('decreaseGuests');
    const increaseBtn = document.getElementById('increaseGuests');
    const guestsInput = document.getElementById('cantidadComensales');

    // Set minimum date to today
    const dateInput = document.getElementById('fecha');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;

    // Set time restrictions (assuming restaurant hours are 11:00 - 22:00)
    const timeInput = document.getElementById('hora');
    timeInput.min = "11:00";
    timeInput.max = "22:00";

    // Guest count controls
    decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(guestsInput.value);
        if (currentValue > 1) {
            guestsInput.value = currentValue - 1;
        }
    });

    increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(guestsInput.value);
        if (currentValue < 10) {
            guestsInput.value = currentValue + 1;
        }
    });

    // Add logout functionality
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('userId');
        window.location.href = '/index.html';
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Calculate HoraSalida (2 hours after HoraEntrada)
        const horaEntrada = timeInput.value;
        const [hours, minutes] = horaEntrada.split(':');
        const horaSalida = `${String(parseInt(hours) + 2).padStart(2, '0')}:${minutes}`;

        const reservationData = {
            IdCliente: parseInt(userId),
            Fecha: dateInput.value,
            HoraEntrada: horaEntrada,
            HoraSalida: horaSalida,
            NumPersonas: parseInt(guestsInput.value),
            Telefono: document.getElementById('telefono').value,
            IdEstado: 1  // Assuming 1 is the ID for 'pendiente' state
        };

        try {
            // First check if the time slot is available
            const checkAvailability = await fetch(`/consultar?fecha=${reservationData.Fecha}`);
            const availabilityData = await checkAvailability.json();

            const existingReservation = availabilityData.find(r => r.Fecha === reservationData.Fecha);
            if (existingReservation && (existingReservation.TotalPersonas + reservationData.NumPersonas) > 50) {
                alert('Lo sentimos, no hay suficiente capacidad para esta fecha y hora.');
                return;
            }

            // If available, proceed with reservation
            const response = await fetch('/reservar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reservationData)
            });

            if (response.ok) {
                window.location.href = '/confirmacion.html';
            } else {
                const error = await response.json();
                alert(error.message || 'Error al procesar la reserva');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la reserva. Por favor, intente nuevamente.');
        }
    });

    // Initialize notification checker
    setInterval(verificarReservasPendientes, 60000); // Check every minute
});
