const Task = require('../models/task.model');
const ussdService = require('../services/ussd.service');

exports.buyBundle = async (req, res) => {
    try {
        const { recipient, bundle_id } = req.body;
        
        const task = await Task.create({ 
            recipient, 
            bundleType: bundle_id 
        });

        ussdService.sendToPhone(task);
        
        res.status(202).json({ message: "Task queued", taskId: task.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
