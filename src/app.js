
import express from 'express';
import { pool } from './db.js';
import { PORT, JWT_SECRET } from './config.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'axelrende123@gmail.com', // Your Gmail
        pass: process.env.EMAIL_PASSWORD || 'cpir gmtn juac wxxm' // Your App Password
    }
});

// Core middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/img', express.static(path.join(__dirname, '../img')));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static('public'));

// Email sending function
async function sendConfirmationEmail(reservationData, userData) {
    const fecha = new Date(reservationData.Fecha).toLocaleDateString();

    const mailOptions = {
        from: '"Parrilladas Restaurant" <your-email@gmail.com>',
        to: userData.Email,
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
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        return false;
    }
}

//sendCancellation email function
async function sendCancellationEmail(reservationData, userData) {
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
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});


app.post('/register', async (req, res) => {
    const { Nombre, Email, Contrasena } = req.body;
    try {
        const query = 'INSERT INTO cliente (Nombre, Email, Contrasena) VALUES (?, ?, ?)';
        const result = await pool.query(query, [Nombre, Email, Contrasena]);
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: 'Registration failed' });
        }
        res.redirect('/index.html');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/login', async (req, res) => {
    const { Email, Contrasena } = req.body;
    try {
        const query = 'SELECT * FROM cliente WHERE Email = ? AND Contrasena = ?';
        const [results] = await pool.query(query, [Email, Contrasena]);

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.status(200).json({
            message: 'Login successful',
            userId: results[0].IdCliente,
            redirectUrl: '/reserva'
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/reserva', (req, res) => {
    res.sendFile(path.join(__dirname, '../reserva.html'));
});

app.post('/reservar', async (req, res) => {
    const { IdCliente, Fecha, HoraEntrada, HoraSalida, NumPersonas, Telefono, IdEstado } = req.body;

    try {
        // Check capacity for the given date and time
        const [existingReservations] = await pool.query(`
            SELECT SUM(NumPersonas) as TotalPersonas
            FROM reserva
            WHERE Fecha = ? 
            AND IdEstado != 3 
            AND ((HoraEntrada <= ? AND HoraSalida >= ?) 
                 OR (HoraEntrada <= ? AND HoraSalida >= ?))`,
            [Fecha, HoraEntrada, HoraEntrada, HoraSalida, HoraSalida]
        );

        const currentCapacity = existingReservations[0].TotalPersonas || 0;
        const totalCapacity = currentCapacity + parseInt(NumPersonas);

        if (totalCapacity > 50) {  // Maximum restaurant capacity
            return res.status(400).json({
                error: 'No hay suficiente capacidad para esta fecha y hora.'
            });
        }

        // Create the reservation
        const [result] = await pool.query(`
            INSERT INTO reserva 
            (IdCliente, Fecha, HoraEntrada, HoraSalida, NumPersonas, Telefono, IdEstado)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [IdCliente, Fecha, HoraEntrada, HoraSalida, NumPersonas, Telefono, IdEstado]
        );

        // Fetch user data for email
        const [userData] = await pool.query(
            'SELECT Nombre, Email FROM cliente WHERE IdCliente = ?',
            [IdCliente]
        );

        if (userData.length > 0) {
            // Send confirmation email
            await sendConfirmationEmail(
                { Fecha, HoraEntrada, NumPersonas, Telefono },
                userData[0]
            );
        }

        res.status(201).json({
            message: 'Reserva creada con éxito.',
            reservationId: result.insertId
        });

    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ error: 'Error al crear la reserva.' });
    }
});

app.get('/consultar', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT Fecha, SUM(NumPersonas) AS TotalPersonas
            FROM reserva
            WHERE IdEstado != 3
            GROUP BY Fecha
            ORDER BY Fecha;
        `);
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar las reservas' });
    }
});

app.get('/consultar-reservas', async (req, res) => {
    try {
        const [resultsquery] = await pool.query(`
            SELECT r.id, r.HoraEntrada, e.Nombre AS NombreEstado, r.Fecha, r.HoraSalida, 
                   c.Nombre, r.NumPersonas, r.Telefono
            FROM reserva r
            JOIN estado e ON r.IdEstado = e.IdEstado
            JOIN cliente c ON c.IdCliente = r.IdCliente
            WHERE e.Nombre = 'pendiente'
        `);
        res.json(resultsquery);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar las reservas' });
    }
});

app.get('/reservas', async (req, res) => {
    try {
        const [resultsquery] = await pool.query(`
            SELECT r.id, r.HoraEntrada, e.Nombre AS NombreEstado, r.Fecha, r.HoraSalida, 
                   c.Nombre, r.NumPersonas, r.Telefono
            FROM reserva r
            JOIN estado e ON r.IdEstado = e.IdEstado
            JOIN cliente c ON c.IdCliente = r.Idcliente
        `);
        res.json(resultsquery);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar las reservas' });
    }
});

app.get('/reservas-cliente/:idCliente', async (req, res) => {
    const { idCliente } = req.params;
    try {
        const [result] = await pool.query(`
            SELECT r.id, r.Fecha, r.HoraEntrada, r.HoraSalida, r.NumPersonas, e.Nombre AS Estado
            FROM reserva r
            JOIN estado e ON r.IdEstado = e.IdEstado
            WHERE r.IdCliente = ?
            ORDER BY r.Fecha DESC, r.HoraEntrada DESC
        `, [idCliente]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'No se encontraron reservas para este cliente' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar reservas del cliente' });
    }
});

app.get('/cliente/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const [rows] = await pool.query(
            'SELECT IdCliente, Nombre, Email FROM cliente WHERE IdCliente = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Error al obtener los detalles del usuario' });
    }
});


app.get('/confirmacion.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/confirmacion.html'));
});

app.get('/historial', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/historial.html'));
});

app.get('/ultima-reserva/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        // Modified query to include all necessary fields and join with cliente table
        const [rows] = await pool.query(`
            SELECT r.*, c.Nombre, c.Email
            FROM reserva r
            JOIN cliente c ON c.IdCliente = r.IdCliente
            WHERE r.IdCliente = ?
            ORDER BY r.id DESC
            LIMIT 1
        `, [userId]);

        if (rows && rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'No se encontró la reserva' });
        }
    } catch (error) {
        console.error('Error fetching last reservation:', error);
        res.status(500).json({ message: 'Error al obtener los detalles de la reserva' });
    }
});


app.patch('/reservas/:id', async (req, res) => {
    const { estado } = req.body;
    const { id } = req.params;

    try {
        // First get the reservation details before updating
        const [reservationDetails] = await pool.query(`
            SELECT r.*, c.IdCliente, c.Nombre, c.Email 
            FROM reserva r
            JOIN cliente c ON r.IdCliente = c.IdCliente
            WHERE r.id = ?
        `, [id]);

        if (reservationDetails.length === 0) {
            return res.status(404).send('Reserva no encontrada');
        }

        // Update the reservation status
        const query = `
            UPDATE reserva 
            SET IdEstado = (SELECT IdEstado FROM estado WHERE Nombre = ?)
            WHERE id = ?`;

        const result = await pool.query(query, [estado, id]);

        if (result.affectedRows === 0) {
            return res.status(404).send('Reserva no encontrada');
        }

        // If the status is being changed to 'Cancelada', send cancellation email
        if (estado === 'Cancelada') {
            try {
                await sendCancellationEmail(
                    reservationDetails[0],
                    {
                        Nombre: reservationDetails[0].Nombre,
                        Email: reservationDetails[0].Email
                    }
                );
            } catch (emailError) {
                console.error('Error sending cancellation email:', emailError);
                // Continue with the response even if email fails
            }
        }

        res.send('Reserva actualizada correctamente');
    } catch (error) {
        console.error('Error updating reservation:', error);
        res.status(500).send('Error del servidor');
    }
});

app.patch('/reserva/:id', (req, res) => {
    const reservaId = req.params.id;
    const { fecha, numPersonas, horaEntrada } = req.body;

    const camposActualizar = {};
    if (fecha) camposActualizar.Fecha = fecha;
    if (numPersonas) camposActualizar.NumPersonas = numPersonas;
    if (horaEntrada) camposActualizar.HoraEntrada = horaEntrada;

    if (Object.keys(camposActualizar).length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    pool.query('UPDATE reserva SET ? WHERE id = ?', [camposActualizar, reservaId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error al actualizar la reserva' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        res.status(200).json({ message: 'Reserva actualizada correctamente' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});