require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { Server } = require('socket.io');
const ussdService = require('./src/services/ussd.service');
const Task = require('./src/models/task.model');
const { sequelize } = require('./src/config/database.config');

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('Android Gateway Connected:', socket.id);
    ussdService.setPhoneSocket(socket);

    // Listen for the phone finishing the USSD sequence
    socket.on('TASK_RESULT', async (data) => {
        await Task.update(
            { status: 'COMPLETED', ussdResponse: data.message },
            { where: { id: data.taskId } }
        );
        console.log(`Task ${data.taskId} finished: ${data.message}`);
    });
});

sequelize.sync({ alter: true }).then(() => {
    console.log("Database tables synced");
});

server.listen(3000, () => console.log('Bridge running on port 3000'));
