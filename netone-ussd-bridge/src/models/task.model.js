const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.config').sequelize;

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    recipient: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Phone number of recipient or "self"'
    },
    bundleId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Bundle ID from bundles.json (e.g., bbb_1, mogigs_2, social_1)'
    },
    bundleType: {
        type: DataTypes.ENUM('data', 'social_media', 'sms', 'combo', 'voice'),
        allowNull: false
    },
    bundleCategory: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Category for data bundles (bbb, mogigs, night, daily, weekly, hourly)'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'PENDING_CONFIRMATION', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'),
        defaultValue: 'PENDING'
    },
    ussdResponse: {
        type: DataTypes.TEXT,
        comment: 'Response received from USSD gateway'
    },
    externalId: {
        type: DataTypes.STRING,
        comment: 'ID from external system (e.g., Chatbot)'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if task failed'
    }
}, {
    timestamps: true,
    tableName: 'tasks',
    indexes: [
        {
            fields: ['status']
        },
        {
            fields: ['bundleType']
        },
        {
            fields: ['createdAt']
        }
    ]
});

module.exports = Task;