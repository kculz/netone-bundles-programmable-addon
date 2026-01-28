const Task = require('../models/task.model');
const ussdService = require('../services/ussd.service');
const bundleService = require('../services/bundle.service');

exports.getAllBundles = async (req, res) => {
    try {
        const bundles = bundleService.getAllBundles();
        res.status(200).json(bundles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDataBundles = async (req, res) => {
    try {
        const dataBundles = bundleService.getDataBundles();
        res.status(200).json(dataBundles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDataBundlesByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const bundles = bundleService.getDataBundlesByCategory(category);
        
        if (!bundles) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.status(200).json(bundles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSocialMediaBundles = async (req, res) => {
    try {
        const socialBundles = bundleService.getSocialMediaBundles();
        res.status(200).json(socialBundles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSMSBundles = async (req, res) => {
    try {
        const smsBundles = bundleService.getSMSBundles();
        res.status(200).json(smsBundles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.buyBundle = async (req, res) => {
    try {
        const { recipient, bundle_id, bundle_type, category } = req.body;
        
        // Validate required fields
        if (!bundle_id || !bundle_type) {
            return res.status(400).json({ 
                error: 'bundle_id and bundle_type are required' 
            });
        }

        // Validate bundle exists
        const bundleExists = bundleService.validateBundle(bundle_id, bundle_type, category);
        if (!bundleExists) {
            return res.status(404).json({ 
                error: 'Bundle not found' 
            });
        }

        // Determine if buying for self or other
        const buyingForOther = recipient && recipient.trim() !== '';
        
        const task = await Task.create({ 
            recipient: buyingForOther ? recipient : 'self',
            bundleId: bundle_id,
            bundleType: bundle_type,
            bundleCategory: category || null,
            status: 'PENDING'
        });

        // Send to phone for USSD execution
        ussdService.sendToPhone(task);
        
        res.status(202).json({ 
            message: buyingForOther 
                ? "Bundle purchase task queued. Waiting for confirmation from device." 
                : "Bundle purchase task queued for self.",
            taskId: task.id,
            recipient: task.recipient,
            bundle: {
                id: bundle_id,
                type: bundle_type,
                category: category
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findByPk(taskId);
        
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        
        res.json({
            taskId: task.id,
            status: task.status,
            recipient: task.recipient,
            bundleId: task.bundleId,
            bundleType: task.bundleType,
            bundleCategory: task.bundleCategory,
            ussdResponse: task.ussdResponse,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};