const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// setup dob conn pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root', 
    database: 'garageDB',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });


const initDB = async ()=> {
    try {
      const conn = await pool.getConnection();
      await conn.query(`
        CREATE TABLE IF NOT EXISTS mechanics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        )
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          address TEXT,
          phone VARCHAR(20) NOT NULL
        )
      `);
      
      await conn.query(`
        CREATE TABLE IF NOT EXISTS cars (
          id INT AUTO_INCREMENT PRIMARY KEY,
          license_number VARCHAR(50) NOT NULL UNIQUE,
          engine_number VARCHAR(50) NOT NULL,
          client_id INT,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          car_id INT NOT NULL,
          mechanic_id INT NOT NULL,
          appointment_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (car_id) REFERENCES cars(id),
          FOREIGN KEY (mechanic_id) REFERENCES mechanics(id)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL
        )
      `);
      
      // check if mechanics exist
      const [mechanics] = await conn.query('SELECT * FROM mechanics');
      if (mechanics.length === 0) {
        await conn.query(`
          INSERT INTO mechanics (name) VALUES 
          ('Bruce Wayne'),
          ('Abdul Jobbar'),
          ('Molla Shojib'),
          ('Light Yagami'),
          ('Rohim Mia'),
          ('Tyler Durden')
        `);
      }
      
      // check admin exists
      const [admins] = await conn.query('SELECT * FROM admins');
      // hashing the default admin pass
      const hashedPass = await bcrypt.hash('admin123',10);
      if (admins.length === 0) {  // default admin credentials 
        await conn.query(`
          INSERT INTO admins (username, password) VALUES 
          (?,?) 
        `,['admin',hashedPass]);
      }
      
      conn.release();
      console.log('garageDB initialized successfully');
    } catch (error) {
      console.log('DB initialization error:', error);
    }
};

initDB();

module.exports = pool;