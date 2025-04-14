const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Home page with appointment form
router.get('/', async (req, res) => {
  try {
    // getting mecganic list
     const [mechanics] = await db.query(`
      SELECT m.id, m.name, 
      (4 - COUNT(DISTINCT a.id)) as available_slots
      FROM mechanics m
      LEFT JOIN appointments a ON m.id = a.mechanic_id AND a.appointment_date = CURDATE()
      GROUP BY m.id
    `);
    
    res.render('index', { 
      mechanics,
      success: req.session.success,
      error: req.session.error
    });
    
    req.session.success = null;
    req.session.error = null;
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).render('error', { message: 'Internal server error' });
  }
});

// Process appointment submission
router.post('/book-appointment', async(req, res) => {
  const { 
    clientName, 
    address, 
    phone, 
    carLicense, 
    carEngine, 
    appointmentDate, 
    mechanicId 
  } = req.body;
  
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();
    
    // validating inputs furthur 
    if (!clientName || !address || !phone || !carLicense || !carEngine || !appointmentDate || !mechanicId) {
      req.session.error = 'All fields are required';
      return res.redirect('/');
    };
    // Check available slots for the day
    const [mechanicSlots] = await conn.query(`
      SELECT (4 - COUNT(*)) as available_slots
      FROM appointments 
      WHERE mechanic_id = ? AND appointment_date = ?
    `, [mechanicId, appointmentDate]);
    
    const availableSlots = mechanicSlots[0]?.available_slots ?? 4;
    
    if (availableSlots <= 0) {
      req.session.error = 'The selected mechanic is not available for this date';
      return res.redirect('/');
    }
    
    // Check if car already has an appointment for this date
    const [existingCar] = await conn.query('SELECT id FROM cars WHERE license_number = ?', [carLicense]);
    
    let carId;
    
    if (existingCar.length > 0) {
            carId = existingCar[0].id;
            // Check if this car already has an appointment on this date
            const [existingAppointment] = await conn.query(`
                SELECT id FROM appointments 
                WHERE car_id = ? AND appointment_date = ?
            `, [carId, appointmentDate]);
            
            // preventing double booking
            if (existingAppointment.length > 0) {
                req.session.error = 'This car already has an appointment scheduled for this date';
                return res.redirect('/');
            }
    } else {
      //find or create client
            let clientId;
            const [existingClient] = await conn.query('SELECT id FROM clients WHERE phone = ?', [phone]);
            
            if (existingClient.length > 0) {
                clientId = existingClient[0].id;
                // if client exists simply updating the client's info
                await conn.query('UPDATE clients SET name = ?, address = ? WHERE id = ?', 
                [clientName, address, clientId]);
            } else {
                // Create new client
                const [newClient] = await conn.query('INSERT INTO clients (name, address, phone) VALUES (?, ?, ?)', 
                [clientName, address, phone]);
                clientId = newClient.insertId;
            }
            // Create new car
            const [newCar] = await conn.query('INSERT INTO cars (license_number, engine_number, client_id) VALUES (?, ?, ?)', 
                [carLicense, carEngine, clientId]);
            carId = newCar.insertId;
    }
    
    // Creating appointment
    await conn.query('INSERT INTO appointments (car_id, mechanic_id, appointment_date) VALUES (?, ?, ?)', 
      [carId, mechanicId, appointmentDate]);
    
    await conn.commit();
    req.session.success = 'Appointment scheduled successfully!';
    res.redirect('/');
    
  } catch (error) {
    await conn.rollback();
    console.error('Error creating appointment:', error);
    req.session.error = 'An error occurred while scheduling your appointment';
    res.redirect('/');
  } finally {
    conn.release();
  }
});

module.exports = router;