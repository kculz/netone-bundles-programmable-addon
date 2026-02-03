require('dotenv').config();
const { sequelize } = require('../src/config/database.config');
const ApiKey = require('../src/models/apikey.model');
const fs = require('fs');
const path = require('path');

const generateKey = async () => {
    try {
        await sequelize.authenticate();

        // Ensure table exists
        await ApiKey.sync();

        // Calculate 30 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const newKey = await ApiKey.create({
            description: 'Generated Key',
            expiresAt: expiresAt
        });

        const keyString = newKey.key;
        console.log(`✅ Generated API Key: ${keyString}`);
        console.log(`📅 Expires At: ${expiresAt.toISOString()}`);

        // Append to file
        const logPath = path.join(__dirname, '../api_keys.txt');
        const logEntry = `Key: ${keyString} | Created: ${new Date().toISOString()} | Expires: ${expiresAt.toISOString()}\n`;

        fs.appendFileSync(logPath, logEntry);
        console.log(`📝 Key saved to ${logPath}`);

    } catch (error) {
        console.error('❌ Error generating key:', error);
    } finally {
        await sequelize.close();
        process.exit();
    }
};

generateKey();
