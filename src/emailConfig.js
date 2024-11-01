import nodemailer from 'nodemailer';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred email service
    auth: {
        user: 'your-email@gmail.com', // Your email
        pass: 'your-app-specific-password' // Your email password or app-specific password
    }
});

// Email template function
const createReservationEmail = (reservationData, userData) => {
    const fecha = new Date(reservationData.Fecha).toLocaleDateString();

    return {
        subject: 'Confirmación de Reserva - Parrilladas Restaurant',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #4CAF50; text-align: center;">¡Reserva Confirmada!</h1>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #333;">Detalles de su reserva:</h2>
                    
                    <div style="margin: 15px 0;">
                        <strong>Nombre:</strong> ${userData.Nombre}
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <strong>Fecha:</strong> ${fecha}
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <strong>Hora de entrada:</strong> ${reservationData.HoraEntrada}
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <strong>Número de personas:</strong> ${reservationData.NumPersonas}
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <strong>Teléfono:</strong> ${reservationData.Telefono}
                    </div>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0;">
                        <strong>Importante:</strong> Si necesita modificar o cancelar su reserva, 
                        por favor contáctenos con al menos 2 horas de anticipación.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #666;">
                        Gracias por elegirnos. ¡Esperamos darle la bienvenida pronto!
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <small style="color: #888;">
                        Este es un correo automático, por favor no responda a este mensaje.
                    </small>
                </div>
            </div>
        `
    };
};

// Send email function
export const sendReservationConfirmation = async (reservationData, userData) => {
    const emailContent = createReservationEmail(reservationData, userData);

    const mailOptions = {
        from: '"Parrilladas Restaurant" <axelrende123@gmail.com>',
        to: userData.Email,
        subject: emailContent.subject,
        html: emailContent.html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        return false;
    }
};
export const sendCancellationEmail = async (reservationData, userData) => {
    const emailContent = {
        subject: 'Confirmación de Cancelación - Parrilladas Restaurant',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #dc3545; text-align: center;">Reserva Cancelada</h1>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #333;">Detalles de la reserva cancelada:</h2>
                    
                    <div style="margin: 15px 0;">
                        <strong>Nombre:</strong> ${userData.Nombre}
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <strong>Fecha:</strong> ${new Date(reservationData.Fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <strong>Hora de entrada:</strong> ${reservationData.HoraEntrada}
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <strong>Número de personas:</strong> ${reservationData.NumPersonas}
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #666;">
                        Si deseas hacer una nueva reserva, puedes hacerlo a través de nuestra página web.
                    </p>
                </div>
            </div>
        `
    };

    const mailOptions = {
        from: '"Parrilladas Restaurant" <axelrende123@gmail.com>',
        to: userData.Email,
        subject: emailContent.subject,
        html: emailContent.html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Cancellation email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending cancellation email:', error);
        return false;
    }
};