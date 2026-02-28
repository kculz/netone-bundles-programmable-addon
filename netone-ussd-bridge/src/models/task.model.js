const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.config').sequelize;

const Task = sequelize.define('Task', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recipient: { type: DataTypes.STRING, allowNull: false },
    bundleType: { type: DataTypes.STRING, allowNull: false },
    status: { 
        type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'), 
        defaultValue: 'PENDING' 
    },
    ussdResponse: { type: DataTypes.TEXT },
    externalId: { type: DataTypes.STRING } // ID from your Chatbot
});

module.exports = Task;
