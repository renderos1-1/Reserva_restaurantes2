document.addEventListener('DOMContentLoaded', async () => {
    // Get userId from localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = '/index.html';
        return;
    }

    // Add logout functionality
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('userId');
        window.location.href = '/index.html';
    });

    const reservationForm = document.querySelector('.reservation-form');

    try {
        const response = await fetch(`/reservas-cliente/${userId}`);
        if (!response.ok) throw new Error('Error al obtener reservas');

        const reservas = await response.json();

        // Verifica si no hay reservas
        if (reservas.length === 0) {
            reservationForm.innerHTML = '<p>No tienes reservas anteriores.</p>';
            return;
        }

        // Crear una tarjeta para cada reserva
        reservas.forEach(reserva => {
            const card = document.createElement('div');
            card.classList.add('reservation-card');

            // Format the date
            const fecha = new Date(reserva.Fecha).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Añadir detalles de la reserva
            card.innerHTML = `
                <h3>Reserva ID: ${reserva.id}</h3>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Hora de Entrada:</strong> ${reserva.HoraEntrada}</p>
                <p><strong>Hora de Salida:</strong> ${reserva.HoraSalida || 'No especificada'}</p>
                <p><strong>Número de Personas:</strong> ${reserva.NumPersonas}</p>
                <p><strong>Estado:</strong> ${reserva.Estado}</p>
            `;

            // Si el estado es "Pendiente", agregar el botón "Cancelar"
            if (reserva.Estado === 'Pendiente') {
                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'Cancelar';
                cancelButton.classList.add('cancel-button');
                cancelButton.onclick = () => mostrarPopupCancelar(reserva.id);

                card.appendChild(cancelButton);
            }

            reservationForm.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
        reservationForm.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p>Error al cargar las reservas. ${error.message}</p>
            </div>
        `;
    }
});

function mostrarPopupCancelar(id) {
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = `  
        <div class="popup-content">
            <h2>¿Estás seguro de que deseas cancelar la reserva?</h2>
            <button id="confirmar-cancelar" class="btn-confirmar">Confirmar</button>
            <button id="cancelar-popup" class="btn-cancelar">Cancelar</button>
        </div>
    `;

    document.body.appendChild(popup);

    document.getElementById('confirmar-cancelar').addEventListener('click', function () {
        cancelarReserva(id);
        document.body.removeChild(popup);
    });

    document.getElementById('cancelar-popup').addEventListener('click', function () {
        document.body.removeChild(popup);
    });
}

function cancelarReserva(id) {
    fetch(`/reservas/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            estado: 'Cancelada'
        })
    })
        .then(response => {
            if (response.ok) {
                console.log(`Reserva ${id} cancelada`);
                window.location.reload(); // Recargar las reservas para actualizar el estado
            } else {
                throw new Error('Error al cancelar la reserva');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cancelar la reserva. Por favor, intente nuevamente.');
        });
}