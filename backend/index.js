const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
});
const pool = require('./config/db');
const path = require('path');

// Make io available to routes
app.set('io', io);

// Routes
const authRoute = require('./routes/auth');
const servicesRoute = require('./routes/services');
const workerRoutes = require('./routes/workers');
const ordersRoutes = require('./routes/orders');
const servicemanRoutes = require('./routes/serviceman');
const notificationsRoutes = require('./routes/notifications');
const customerRoutes = require('./routes/customer');
const adminRoutes = require('./routes/admin');

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files (including images)
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/services', servicesRoute);
app.use('/api/workers', workerRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/serviceman', servicemanRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Join user-specific room for targeted updates
    socket.on('joinRoom', ({ userId, userType }) => {
        if (userId && userType) {
            const roomName = `${userType}_${userId}`;
            socket.join(roomName);
            console.log(`User joined room: ${roomName}`);
        }
    });

    // Handle location updates from workers
    socket.on('updateLocation', async (data) => {
        try {
            const { workerId, latitude, longitude } = data;
            await pool.query(
                'UPDATE worker_profiles SET current_location = point($1, $2) WHERE worker_id = $3',
                [longitude, latitude, workerId]
            );
            io.emit('workerLocationUpdated', data);
        } catch (err) {
            console.error('Error updating location:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving static files from: ${path.join(__dirname, 'public', 'images')}`);
});
