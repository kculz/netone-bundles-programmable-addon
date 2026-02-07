const express = require('express');
const router = express.Router();
const bundleController = require('../controllers/bundle.controller');

// GET /api/v1/bundles - Get all bundles (all types)
router.get('/', bundleController.getAllBundles);

// GET /api/v1/bundles/data - Get all data bundles
router.get('/data', bundleController.getDataBundles);

// GET /api/v1/bundles/data/:category - Get data bundles by category (bbb, mogigs, night, daily, weekly, hourly)
router.get('/data/:category', bundleController.getDataBundlesByCategory);

// GET /api/v1/bundles/social-media - Get social media bundles
router.get('/social-media', bundleController.getSocialMediaBundles);

// GET /api/v1/bundles/sms - Get SMS bundles
router.get('/sms', bundleController.getSMSBundles);

// POST /api/v1/bundles/buy - Purchase a bundle
router.post('/buy', bundleController.buyBundle);

// POST /api/v1/bundles/balance - Check Balance
router.post('/balance', bundleController.checkBalance);

// GET /api/v1/bundles/balance/last/:currency - Get Last Balance
router.get('/balance/last/:currency', bundleController.getLastBalance);

// POST /api/v1/bundles/confirm/:taskId - Confirm a purchase
router.post('/confirm/:taskId', bundleController.confirmBundle);

// GET /api/v1/bundles/status/:taskId - Get task status
router.get('/status/:taskId', bundleController.getTaskStatus);

module.exports = router;