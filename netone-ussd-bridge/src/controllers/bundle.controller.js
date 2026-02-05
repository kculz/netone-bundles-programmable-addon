const Task = require('../models/task.model');
const ussdService = require('../services/ussd.service');
const bundleService = require('../services/bundle.service');
const taskQueue = require('../queue/task.queue');

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
            status: 'PENDING_CONFIRMATION'
        });

        // Response requiring confirmation
        res.status(202).json({
            message: "Bundle purchase task created. Please confirm to proceed.",
            taskId: task.id,
            status: 'PENDING_CONFIRMATION',
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

const taskEvents = require('../events/task.events');

exports.confirmBundle = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { wait } = req.query; // Check if user wants to wait for result
        const shouldWait = wait === 'true';

        const task = await Task.findByPk(taskId);

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        if (task.status !== 'PENDING_CONFIRMATION' && task.status !== 'PENDING') {
            return res.status(400).json({ error: `Task is already ${task.status}` });
        }

        // Update status and add to queue
        await task.update({ status: 'QUEUED' });

        await taskQueue.add({ id: task.id }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            }
        });

        if (!shouldWait) {
            return res.json({
                message: "Task confirmed and queued for execution",
                taskId: task.id,
                status: 'QUEUED'
            });
        }

        // Wait for result
        const timeoutMs = 60000; // 60 seconds timeout
        let isResponded = false;

        const successHandler = (data) => {
            if (isResponded) return;
            isResponded = true;
            cleanup();
            res.json({
                message: "Bundle purchased successfully",
                taskId: task.id,
                status: 'COMPLETED',
                details: data
            });
        };

        const failureHandler = (data) => {
            if (isResponded) return;
            isResponded = true;
            cleanup();
            res.status(400).json({
                error: "Bundle purchase failed",
                taskId: task.id,
                status: 'FAILED',
                details: data
            });
        };

        const cleanup = () => {
            taskEvents.off(`completed:${task.id}`, successHandler);
            taskEvents.off(`failed:${task.id}`, failureHandler);
            clearTimeout(timeoutId);
        };

        taskEvents.once(`completed:${task.id}`, successHandler);
        taskEvents.once(`failed:${task.id}`, failureHandler);

        const timeoutId = setTimeout(() => {
            if (isResponded) return;
            isResponded = true;
            cleanup();
            // Return 202 because it's technically still processing or we just timed out waiting
            res.status(202).json({
                message: "Task is still processing. Please check status later.",
                taskId: task.id,
                status: 'PROCESSING'
            });
        }, timeoutMs);

    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            console.error('Error after response sent:', error);
        }
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