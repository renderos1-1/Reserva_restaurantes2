// notifications.js

// Create a notification container if it doesn't exist
function createNotificationContainer() {
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

// Show notification function
function showNotification(title, message, type = 'default') {
    const container = createNotificationContainer();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    notification.innerHTML = `
        <div class="notification-icon">
            ${type === 'urgent' ? '⚠️' : '🕒'}
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <p class="notification-message">${message}</p>
        </div>
        <button class="notification-close">×</button>
    `;

    container.appendChild(notification);

    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        removeNotification(notification);
    });

    setTimeout(() => {
        if (notification.parentElement) {
            removeNotification(notification);
        }
    }, 8000);
}

// Remove notification with animation
function removeNotification(notification) {
    notification.classList.add('exiting');
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 500);
}

// Show reminder popup
function showReminderPopup(reservation) {
    const backdrop = document.createElement('div');
    backdrop.className = 'reminder-popup-backdrop';
    document.body.appendChild(backdrop);

    const popup = document.createElement('div');
    popup.className = 'reminder-popup';

    popup.innerHTML = `
        <div class="reminder-bell">🔔</div>
        <div class="reminder-title">¡Recordatorio de Reserva!</div>
        <div class="reminder-content">
            Tu reserva está programada para dentro de 2 horas y 10 minutos:
            <div class="reminder-time">${reservation.HoraEntrada}</div>
            <div>Mesa para ${reservation.NumPersonas} personas</div>
            <div>Fecha: ${new Date(reservation.Fecha).toLocaleDateString()}</div>
        </div>
        <button class="reminder-button">Entendido</button>
    `;

    document.body.appendChild(popup);

    const button = popup.querySelector('.reminder-button');
    button.onclick = () => {
        document.body.removeChild(backdrop);
        document.body.removeChild(popup);
    };

    setTimeout(() => {
        if (document.body.contains(backdrop)) {
            document.body.removeChild(backdrop);
            document.body.removeChild(popup);
        }
    }, 30000);
}

// Check reservations and show reminders
async function checkReservationReminders() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log('No user ID found');
        return;
    }

    try {
        console.log('Fetching reservations for user:', userId);
        const response = await fetch(`/reservas-cliente/${userId}`);
        if (!response.ok) throw new Error('Error al obtener reservas');

        const reservations = await response.json();
        console.log('Found reservations:', reservations);

        const now = new Date();
        console.log('Current time:', now);

        const upcomingReservations = reservations.filter(reservation => {
            if (reservation.Estado !== 'Pendiente') {
                console.log('Reservation not pending:', reservation);
                return false;
            }

            const reservationDate = new Date(reservation.Fecha);
            const [hours, minutes] = reservation.HoraEntrada.split(':');
            reservationDate.setHours(hours, minutes, 0);

            console.log('Reservation date/time:', reservationDate);

            const timeDiff = (reservationDate - now) / (1000 * 60);
            console.log('Time difference in minutes:', timeDiff);

            // 2 hours and 10 minutes (130 minutes)
            return timeDiff > 14 && timeDiff <= 15;
        });

        console.log('Upcoming reservations that match criteria:', upcomingReservations);

        upcomingReservations.forEach(reservation => {
            console.log('Showing notification for reservation:', reservation);
            showReminderPopup(reservation);
        });

    } catch (error) {
        console.error('Error checking reminders:', error);
    }
}

// Test functions
function showTestNotification() {
    console.log('Testing notification...');

    const sampleReservation = {
        HoraEntrada: '14:00',
        NumPersonas: 4,
        Fecha: new Date().toISOString().split('T')[0]
    };

    showReminderPopup(sampleReservation);
}

async function testWithActualReservations() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('No hay usuario conectado. Por favor, inicie sesión.');
        return;
    }

    try {
        const response = await fetch(`/reservas-cliente/${userId}`);
        if (!response.ok) throw new Error('Error al obtener reservas');

        const reservations = await response.json();
        console.log('Reservas encontradas:', reservations);

        if (reservations.length === 0) {
            alert('No se encontraron reservas para mostrar');
            return;
        }

        const pendingReservation = reservations.find(r => r.Estado === 'Pendiente');
        if (pendingReservation) {
            console.log('Mostrando notificación para:', pendingReservation);
            showReminderPopup(pendingReservation);
        } else {
            alert('No se encontraron reservas pendientes');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error al obtener las reservas');
    }
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Notification system initializing...');

    // Set up test button
    const testButton = document.getElementById('testNotification');
    if (testButton) {
        testButton.addEventListener('click', () => {
            console.log('Test button clicked');
            testWithActualReservations();
        });
    }

    // Set up keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            console.log('Keyboard shortcut triggered');
            testWithActualReservations();
        }
    });

    // Start reservation checks
    const userId = localStorage.getItem('userId');
    if (userId) {
        console.log('Starting reservation checks for user:', userId);
        checkReservationReminders(); // Initial check
        setInterval(checkReservationReminders, 10000); // Check every 10 seconds for testing
    } else {
        console.log('No user ID found in localStorage');
    }
});