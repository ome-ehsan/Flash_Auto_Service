const express = require('express');
const router = express.Router();
const db = require('../models/db');
const bcrypt = require('bcryptjs');


// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
};

// admin login page
router.get('/login', (req, res) => {
  res.render('adminLogin', { error: req.session.loginError });
  req.session.loginError = null;
});

// admin login
router.post('/login', async(req, res) => {
  const { username, password } = req.body;
  
  try {
    const [admin] = await db.query('SELECT * FROM admins WHERE username = ?' 
      [username]);
    if (admin.length > 0) {
            // check whether pass is correct
        const isCorrectPass = await bcrypt.compare(password, admin[0].password);
        if(isCorrectPass) {
            req.session.isAdmin = true;
            res.redirect('/admin/dashboard');
        }else{
            req.session.loginError = "Invalid username and passward";
            res.redirect('/admin/login');
        }
    } else {
        req.session.loginError = "Invalid username or password"; 
        res.redirect('/admin/login');
    }
  } catch (error) {
    console.error('Login error:', error);
    req.session.loginError = 'An error occurred during login';
    res.redirect('/admin/login');
  }
});


// Admin logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Get all appointments with relevant  information
    const [appointments] = await db.query(`
      SELECT a.id, a.appointment_date, 
             c.license_number, c.engine_number,
             cl.name as client_name, cl.phone,
             m.id as mechanic_id, m.name as mechanic_name
      FROM appointments a
      JOIN cars c ON a.car_id = c.id
      JOIN clients cl ON c.client_id = cl.id
      JOIN mechanics m ON a.mechanic_id = m.id
      ORDER BY a.appointment_date DESC
    `);
    
    //all mechanics
    const [mechanics] = await db.query('SELECT id, name FROM mechanics');
    res.render('admin', { 
      appointments, 
      mechanics,
      success: req.session.adminSuccess,
      error: req.session.adminError
    });
    
    // clearing fslash messages
    req.session.adminSuccess = null;
    req.session.adminError = null;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).render('error', { message: 'Server error. Please try again.' });
  }
});


// Update appointment
router.post('/update-appointment', isAuthenticated, async(req,res)=> {
  const { appointmentId, mechanicId, appointmentDate } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // current appointment details
    const [currentAppointment] = await conn.query(`
      SELECT car_id, mechanic_id, appointment_date 
      FROM appointments 
      WHERE id = ?
    `, [appointmentId]);

    if (currentAppointment.length === 0) {
      req.session.adminError = 'Appointment not found';
      return res.redirect('/admin/dashboard');
    }
    const carId = currentAppointment[0].car_id;
    // availibility checking after either meachanic or car is changed
    if (mechanicId != currentAppointment[0].mechanic_id || 
        appointmentDate != currentAppointment[0].appointment_date) {
      // checking mechanic availability for the new date
      const [mechanicSlots] = await conn.query(`
        SELECT (4 - COUNT(*)) as available_slots
        FROM appointments 
        WHERE mechanic_id = ? AND appointment_date = ? AND id != ?
      `, [mechanicId, appointmentDate, appointmentId]);
      
      const availableSlots = mechanicSlots[0]?.available_slots ?? 4;
      
      if (availableSlots <= 0) {
        req.session.adminError = 'The selected mechanic is not available for this date';
        return res.redirect('/admin/dashboard');
      }
      // Check if car already has another appointment on this date
      const [existingAppointment] = await conn.query(`
        SELECT id FROM appointments 
        WHERE car_id = ? AND appointment_date = ? AND id != ?
      `, [carId, appointmentDate, appointmentId]);

      if (existingAppointment.length > 0) {
        req.session.adminError = 'This car already has another appointment scheduled for this date';
        return res.redirect('/admin/dashboard');
      }
    }
    // appointment update
    await conn.query(`
      UPDATE appointments 
      SET mechanic_id = ?, appointment_date = ? 
      WHERE id = ?
    `, [mechanicId, appointmentDate, appointmentId]);
    
    await conn.commit();
    
    req.session.adminSuccess = 'Appointment updated successfully';
    res.redirect('/admin/dashboard');
    
  } catch (error) {
    await conn.rollback();
    console.error('Error updating appointment:', error);
    req.session.adminError = 'An error occurred while updating the appointment';
    res.redirect('/admin/dashboard');
  } finally {
    conn.release();
  }
});

module.exports = router;