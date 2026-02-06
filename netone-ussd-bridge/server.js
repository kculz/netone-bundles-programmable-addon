require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { Server } = require('socket.io');
const ussdService = require('./src/services/ussd.service');
const Task = require('./src/models/task.model');
const { sequelize } = require('./src/config/database.config');
require('./src/queue/task.worker'); // Start the worker
const { scheduleCleanup } = require('./src/queue/cleanup.queue');

// Schedule cleanup
scheduleCleanup();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('Android Gateway Connected:', socket.id);
    ussdService.setPhoneSocket(socket);

    // Listen for task result updates
    socket.on('TASK_RESULT', async (data) => {
        try {
            const { taskId, status, message, error } = data;

            console.log(`Task ${taskId} result received:`, { status, message });

            const updateData = {
                status: status,
                ussdResponse: message,
                updatedAt: new Date()
            };

            if (error) {
                updateData.errorMessage = error;
            }

            await Task.update(
                updateData,
                { where: { id: taskId } }
            );

            console.log(`Task ${taskId} updated to status: ${status}`);

            // Emit internal event for waiting controllers
            const taskEvents = require('./src/events/task.events');
            if (status === 'COMPLETED') {
                taskEvents.emit(`completed:${taskId}`, { taskId, status, message });
            } else if (status === 'FAILED') {
                taskEvents.emit(`failed:${taskId}`, { taskId, status, message: error || message });
            }

        } catch (err) {
            console.error('Error updating task:', err);
        }
    });

    // Listen for confirmation requests (when buying for other)
    socket.on('REQUEST_CONFIRMATION', async (data) => {
        try {
            const { taskId, recipient, bundleDetails } = data;

            console.log(`Confirmation requested for task ${taskId}:`, { recipient, bundleDetails });

            await Task.update(
                {
                    status: 'PROCESSING',
                    ussdResponse: 'Waiting for user confirmation on device'
                },
                { where: { id: taskId } }
            );

            // Here you could emit to a web client or notification service
            // to inform the user that confirmation is needed on the device
            console.log(`Task ${taskId} waiting for device confirmation`);
        } catch (err) {
            console.error('Error processing confirmation request:', err);
        }
    });

    // Listen for task progress updates
    socket.on('TASK_PROGRESS', async (data) => {
        try {
            const { taskId, step, message } = data;

            console.log(`Task ${taskId} progress - Step ${step}: ${message}`);

            await Task.update(
                {
                    ussdResponse: message,
                    updatedAt: new Date()
                },
                { where: { id: taskId } }
            );
        } catch (err) {
            console.error('Error updating task progress:', err);
        }
    });

    // Listen for errors from the device
    socket.on('TASK_ERROR', async (data) => {
        try {
            const { taskId, error, step } = data;

            console.error(`Task ${taskId} error at step ${step}:`, error);

            await Task.update(
                {
                    status: 'FAILED',
                    errorMessage: error,
                    ussdResponse: `Failed at step ${step}: ${error}`,
                    updatedAt: new Date()
                },
                { where: { id: taskId } }
            );

            // Emit internal event for waiting controllers
            const taskEvents = require('./src/events/task.events');
            taskEvents.emit(`failed:${taskId}`, { taskId, status: 'FAILED', message: error });

        } catch (err) {
            console.error('Error handling task error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Android Gateway Disconnected:', socket.id);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Sync database and start server
sequelize.sync({ alter: true }).then(() => {
    console.log("✅ Database tables synced");

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`🚀 Bridge server running on port ${PORT}`);
        console.log(`📡 WebSocket server ready for Android Gateway connections`);
    });
}).catch((err) => {
    console.error("❌ Database sync failed:", err);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        sequelize.close();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    server.close(() => {
        console.log('Server closed');
        sequelize.close();
        process.exit(0);
    });
});