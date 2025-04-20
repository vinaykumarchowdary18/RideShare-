const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/carpooling')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

// User Schema with strict validation
const userSchema = new mongoose.Schema({
    firstName: { 
        type: String, 
        required: true 
    },
    lastName: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    phone: { 
        type: String, 
        required: true 
    },
    userType: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    timestamps: true,
    strict: true
});

const User = mongoose.model('User', userSchema);

// Trip Schema
const tripSchema = new mongoose.Schema({
    departure: { type: String, required: true },
    destination: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    price: { type: Number, required: true },
    seats: { type: Number, required: true }
});

const Trip = mongoose.model('Trip', tripSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Modified signup route
app.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, userType } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = new User({
            firstName,
            lastName,
            email,
            password,
            phone,
            userType
        });

        const savedUser = await newUser.save();
        res.status(201).json({ message: 'Signup successful!', firstName: savedUser.firstName, lastName: savedUser.lastName });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Modified login route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({ message: 'Login successful', firstName: user.firstName, lastName: user.lastName });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// Route to post a trip
app.post('/trips', async (req, res) => {
    try {
        console.log('Incoming Trip Data:', req.body); // Log the incoming data

        const trip = new Trip(req.body);
        const savedTrip = await trip.save();
        res.status(201).json(savedTrip);
    } catch (error) {
        console.error('Error saving trip:', error);
        res.status(500).json({ message: 'Error saving trip' });
    }
});

// Route to get all trips
app.get('/trips', async (req, res) => {
    try {
        const trips = await Trip.find();
        res.json(trips);
    } catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({ message: 'Error fetching trips' });
    }
});

// Route to search for trips
app.get('/trips/search', async (req, res) => {
    try {
        const { departure, destination, date } = req.query;

        // Build the search query
        const query = {};
        if (departure) query.departure = { $regex: departure, $options: 'i' }; // Case-insensitive match
        if (destination) query.destination = { $regex: destination, $options: 'i' };
        if (date) query.date = date;

        const trips = await Trip.find(query);
        res.json(trips);
    } catch (error) {
        console.error('Error searching trips:', error);
        res.status(500).json({ message: 'Error searching trips' });
    }
});

// Route to book a trip
app.post('/trips/book/:id', async (req, res) => {
    try {
        const tripId = req.params.id;

        // Find the trip by ID
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }

        // Check if there are available seats
        if (trip.seats <= 0) {
            return res.status(400).json({ message: 'No seats available for this trip' });
        }

        // Decrease the number of available seats
        trip.seats -= 1;
        await trip.save();

        res.status(200).json({ message: 'Trip booked successfully', trip });
    } catch (error) {
        console.error('Error booking trip:', error);
        res.status(500).json({ message: 'Error booking trip' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});