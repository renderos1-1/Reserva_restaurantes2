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


    //notifications


    // Add logout functionality
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('userId');
        window.location.href = '/index.html';
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fechaInput = document.getElementById('fecha');
        const horaInput = document.getElementById('hora');
        const numPersonas = document.getElementById('cantidadComensales');

        // Validación de la fecha
        if (!fechaInput.value) {
            alert('Por favor, selecciona una fecha para la reserva.');
            return;
        }

        const selectedDate = new Date(fechaInput.value);
        selectedDate.setDate(selectedDate.getDate() + 1); // Ajustar la fecha
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Verificar si la fecha seleccionada es anterior a hoy
        if (selectedDate < today) {
            alert('La fecha seleccionada no puede ser anterior a hoy. Por favor, elige otra fecha.');
            return;
        }

        // Validación de la hora
        if (!horaInput.value) {
            alert('Por favor, selecciona una hora para la reserva.');
            return;
        }

        const [hora, minutos] = horaInput.value.split(':').map(Number);
        const fechaSeleccionada = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hora, minutos);
        const horaLimiteInicio = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0); // 09:00
        const horaLimiteFin = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 19, 0); // 19:00
        const ahora = new Date();

        // Validar si la hora está dentro del rango permitido
        if (fechaSeleccionada < horaLimiteInicio) {
            alert('La hora de entrada debe ser después de las 09:00.');
            return;
        } else if (fechaSeleccionada > horaLimiteFin) {
            alert('La hora de entrada debe ser antes de las 19:00.');
            return;
        }

        // Validar si la fecha es hoy y la hora de reserva es al menos una hora en el futuro
        if (selectedDate.toDateString() === ahora.toDateString()) {
            const horaConMargen = new Date(ahora);
            horaConMargen.setHours(ahora.getHours() + 1);

            if (fechaSeleccionada < horaConMargen) {
                alert('La reserva debe hacerse con al menos 1 hora de anticipación y no debe ser posterior a la hora actual.');
                return;
            }
        }

        // Calculate HoraSalida (2 hours after HoraEntrada)
        const horaSalida = `${String(parseInt(hora) + 2).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;

        const reservationData = {
            IdCliente: parseInt(userId),
            Fecha: dateInput.value,
            HoraEntrada: horaInput.value,
            HoraSalida: horaSalida,
            NumPersonas: parseInt(guestsInput.value),
            Telefono: document.getElementById('telefono').value,
            IdEstado: 1  // Assuming 1 is the ID for 'pendiente' state
        };

        try {
            // First check if the time slot is available
            const checkAvailability = await fetch(`/consultar?fecha=${reservationData.Fecha}`);
            if (!checkAvailability.ok) {
                throw new Error('Error al verificar disponibilidad');
            }
            const availabilityData = await checkAvailability.json();
            const existingReservation = availabilityData.find(r => r.Fecha === reservationData.Fecha);
            const totalReservados = existingReservation ? existingReservation.TotalPersonas : 0;

            // Última verificación: consultar el total de personas para la fecha seleccionada
            const totalResponse = await fetch('/consultar');
            if (!totalResponse.ok) {
                throw new Error('Error al consultar capacidad');
            }
            const reservas = await totalResponse.json();

            // Convertir la fecha del input a YYYY-MM-DD para la comparación
            const fechaSeleccionada = dateInput.value; // 'YYYY-MM-DD'

            // Filtrar reservas para la fecha seleccionada
            const reservasFecha = reservas.filter(r => {
                const fechaReserva = new Date(r.Fecha).toISOString().split('T')[0];
                return fechaReserva === fechaSeleccionada;
            });

            // Extraer el total de personas para esa fecha
            const totalPersonasDia = reservasFecha.length > 0 ? parseInt(reservasFecha[0].TotalPersonas) : 0;
            const personasSolicitadas = parseInt(guestsInput.value);
            const totalPersonasPropuesto = totalPersonasDia + personasSolicitadas;

            // Verificaciones de capacidad
            if (totalPersonasDia >= 50) {
                alert('No se puede proceder, ya que el total de personas para ese día ha alcanzado el límite de 50.');
                return;
            }

            if (totalPersonasPropuesto > 50) {
                const exceso = totalPersonasPropuesto - 50;
                alert(`No tenemos espacios suficientes para este día. La reserva excede por ${exceso} persona(s). Escoge otra fecha o reduce el número de comensales.`);
                return;
            }

            // If available, proceed with reservation
            const reserveResponse = await fetch('/reservar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reservationData)
            });

            const responseData = await reserveResponse.json();

            if (reserveResponse.ok) {
                // Store the reservation ID if needed
                if (responseData.reservationId) {
                    localStorage.setItem('lastReservationId', responseData.reservationId);
                }
                window.location.replace('/confirmacion.html');
            } else {
                throw new Error(responseData.error || 'Error al procesar la reserva');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error al procesar la reserva. Por favor, intente nuevamente.');
        }
    });
});

