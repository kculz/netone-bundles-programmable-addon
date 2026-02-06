const taskQueue = require('./task.queue');
const ussdService = require('../services/ussd.service');
const Task = require('../models/task.model');

// Process tasks
taskQueue.process(async (job) => {
    const { id } = job.data;
    console.log(`Processing task queue job for Task ID: ${id}`);

    try {
        // Fetch fresh task data
        const task = await Task.findByPk(id);

        if (!task) {
            throw new Error(`Task ${id} not found in database`);
        }

        // Update status to PROCESSING
        await task.update({
            status: 'PROCESSING',
            ussdResponse: 'Task dequeued, sending to gateway...'
        });

        // Send to phone
        // This relies on the socket being set globally in ussdService
        ussdService.sendToPhone(task);

        console.log(`Task ${id} sent to gateway successfully`);
        return { success: true };

    } catch (error) {
        console.error(`Error processing task ${id}:`, error);

        // Update task status to FAILED if it was a fatal error
        // But if it's just "Gateway Offline", Bull handles retries
        // We might want to mark as QUEUED/RETRYING in DB if we want visibility

        if (job.attemptsMade === job.opts.attempts - 1) {
            // Last attempt failed
            try {
                const task = await Task.findByPk(id);
                if (task) {
                    await task.update({
                        status: 'FAILED',
                        errorMessage: error.message,
                        ussdResponse: 'Max retries exceeded'
                    });
                }
            } catch (dbError) {
                console.error('Failed to update task status on failure:', dbError);
            }
        }

        throw error;
    }
});

module.exports = {
    start: () => console.log('Worker started listening for tasks')
};
