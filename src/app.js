import jwt from 'jsonwebtoken';
import express from 'express';
import { pool } from './db.js';
import { PORT, JWT_SECRET } from './config.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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



// Public routes
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
            userId: results[0].IdCliente,  // Send the user ID
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

app.post('/reservar', async (req, res) => {
    const { IdCliente, Fecha, HoraEntrada, HoraSalida, NumPersonas, Telefono, IdEstado } = req.body;

    try {
        // Check total capacity for the given date and time
        const [existingReservations] = await pool.query(`
            SELECT SUM(NumPersonas) as TotalPersonas
            FROM reserva
            WHERE Fecha = ? 
            AND IdEstado != 3 
            AND ((HoraEntrada <= ? AND HoraSalida >= ?) 
                 OR (HoraEntrada <= ? AND HoraSalida >= ?))`,
            [Fecha, HoraEntrada, HoraEntrada, HoraSalida, HoraSalida]
        );

        const totalPersonas = (existingReservations[0].TotalPersonas || 0) + NumPersonas;
        if (totalPersonas > 50) {  // Assuming restaurant capacity is 50
            return res.status(400).json({
                error: 'No hay suficiente capacidad para esta fecha y hora.'
            });
        }

        // Proceed with insertion if capacity is available
        const query = `
            INSERT INTO reserva 
            (IdCliente, Fecha, HoraEntrada, HoraSalida, NumPersonas, Telefono, IdEstado)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(query, [
            IdCliente, Fecha, HoraEntrada, HoraSalida, NumPersonas, Telefono, IdEstado
        ]);

        res.status(201).json({
            message: 'Reserva creada con éxito.',
            reservationId: result.insertId
        });
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ error: 'Error al crear la reserva.' });
    }
});

app.get('/confirmacion.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/confirmacion.html'));
});

app.get('/ultima-reserva/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Adjust the query according to your database schema
        const query = `
            SELECT * FROM reserva 
            WHERE IdCliente = ? 
            ORDER BY id DESC 
            LIMIT 1
        `;

        // If using mysql2
        const [rows] = await pool.query(query, [userId]);

        if (rows && rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'No se encontró la reserva' });
        }
    } catch (error) {
        console.error('Error al obtener la última reserva:', error);
        res.status(500).json({ message: 'Error al obtener los detalles de la reserva' });
    }
});

app.patch('/reservas/:id', async (req, res) => {
    const { estado, horaSalida } = req.body;
    const { id } = req.params;

    try {
        const query = `
            UPDATE reserva 
            SET IdEstado = (SELECT IdEstado FROM estado WHERE Nombre = ?),
                HoraSalida = ?
            WHERE id = ?`;

        const result = await pool.query(query, [estado, horaSalida || null, id]);
        if (result.affectedRows === 0) {
            return res.status(404).send('Reserva no encontrada');
        }
        res.send('Reserva actualizada correctamente');
    } catch (error) {
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