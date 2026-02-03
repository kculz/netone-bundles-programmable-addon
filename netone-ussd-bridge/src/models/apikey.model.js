const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.config').sequelize;

const ApiKey = sequelize.define('ApiKey', {
    key: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Who this key belongs to'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    isValid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true,
    tableName: 'api_keys'
});

module.exports = ApiKey;
