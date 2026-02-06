const Queue = require('bull');
const { redis } = require('../config/redis.config');
const ApiKey = require('../models/apikey.model');
const { Op } = require('sequelize');

const cleanupQueue = new Queue('key-cleanup', {
    redis: redis
});

// Process cleanup
cleanupQueue.process(async (job) => {
    console.log('🧹 Running API Key Cleanup Job...');

    try {
        const result = await ApiKey.destroy({
            where: {
                expiresAt: {
                    [Op.lt]: new Date()
                }
            }
        });

        console.log(`🗑️ Removed ${result} expired API keys.`);
        return { removed: result };
    } catch (error) {
        console.error('Error cleaning up keys:', error);
        throw error;
    }
});

// Schedule the job (repeat every day)
const scheduleCleanup = async () => {
    // Remove old repeatable jobs to avoid duplicates
    const repeatableJobs = await cleanupQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await cleanupQueue.removeRepeatableByKey(job.key);
    }

    // Add new repeatable job (run every 24 hours)
    await cleanupQueue.add({}, {
        repeat: {
            cron: '0 0 * * *' // Every midnight
        }
    });

    console.log('⏰ API Key cleanup job scheduled (Daily at 00:00)');
};

module.exports = {
    cleanupQueue,
    scheduleCleanup
};
