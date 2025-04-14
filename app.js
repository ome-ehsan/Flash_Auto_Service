const express = require('express');
const path = require('path');
const session = require('express-session');
//const bodyParser = require('body-parser');


// Importing routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const app = express();
const PORT = 8000;
app.set('view engine', 'ejs');   // template engine for rendering embedded JS
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));  // using express directly 
app.use(express.json());   // using express directly 

// session middleware
app.use(session({
  secret: 'secret-of-garageDb',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hour
}));

app.use('/', indexRoutes);
app.use('/admin', adminRoutes);
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;