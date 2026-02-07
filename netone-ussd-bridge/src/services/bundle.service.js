const bundlesData = require('../utils/bundles.json');

class BundleService {
    constructor() {
        this.bundleCatalog = bundlesData.bundle_catalog;
    }

    getAllBundles(currency = 'usd') {
        return {
            data_bundles: this.getDataBundles(currency),
            social_media_bundles: this.getSocialMediaBundles(currency),
            sms_bundles: this.getSMSBundles(currency),
            combo_bundles: this.getComboBundles(currency),
            voice_bundles: this.getVoiceBundles(currency)
        };
    }

    _getBundlesForCurrency(currency) {
        return this.bundleCatalog[currency.toLowerCase()] || this.bundleCatalog['usd'];
    }

    getDataBundles(currency = 'usd') {
        const bundles = this._getBundlesForCurrency(currency);
        const categories = bundles.data_bundles;
        const result = {};

        for (const [key, value] of Object.entries(categories)) {
            result[key] = {
                category_id: value.category_id,
                category_name: value.category_name,
                description: value.description,
                bundles: value.bundles
            };
        }

        return result;
    }

    getDataBundlesByCategory(category, currency = 'usd') {
        const bundles = this._getBundlesForCurrency(currency);
        const categoryData = bundles.data_bundles[category];

        if (!categoryData) {
            return null;
        }

        return {
            category_id: categoryData.category_id,
            category_name: categoryData.category_name,
            description: categoryData.description,
            bundles: categoryData.bundles
        };
    }

    getSocialMediaBundles(currency = 'usd') {
        const bundles = this._getBundlesForCurrency(currency);
        return {
            category_name: bundles.social_media_bundles.category_name,
            bundles: bundles.social_media_bundles.bundles
        };
    }

    getSMSBundles(currency = 'usd') {
        const bundles = this._getBundlesForCurrency(currency);
        return {
            category_name: bundles.sms_bundles.category_name,
            bundles: bundles.sms_bundles.bundles
        };
    }

    getComboBundles(currency = 'usd') {
        const bundles = this._getBundlesForCurrency(currency);
        return {
            category_name: bundles.combo_bundles.category_name,
            description: bundles.combo_bundles.description,
            bundles: bundles.combo_bundles.bundles
        };
    }

    getVoiceBundles(currency = 'usd') {
        const bundles = this._getBundlesForCurrency(currency);
        return {
            category_name: bundles.voice_bundles.category_name,
            bundles: bundles.voice_bundles.bundles
        };
    }

    validateBundle(bundleId, bundleType, category = null, currency = 'usd') {
        switch (bundleType) {
            case 'data':
                return this._validateDataBundle(bundleId, category, currency);
            case 'social_media':
                return this._validateSocialMediaBundle(bundleId, currency);
            case 'sms':
                return this._validateSMSBundle(bundleId, currency);
            case 'combo':
                return this._validateComboBundle(bundleId, currency);
            case 'voice':
                return this._validateVoiceBundle(bundleId, currency);
            default:
                return false;
        }
    }

    _validateDataBundle(bundleId, category, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        if (category) {
            const categoryData = bundles.data_bundles[category];
            if (!categoryData) return false;
            return categoryData.bundles.some(bundle => bundle.id === bundleId);
        }

        // Search all data bundle categories
        for (const categoryData of Object.values(bundles.data_bundles)) {
            if (categoryData.bundles.some(bundle => bundle.id === bundleId)) {
                return true;
            }
        }
        return false;
    }

    _validateSocialMediaBundle(bundleId, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        return bundles.social_media_bundles.bundles.some(
            bundle => bundle.id === bundleId
        );
    }

    _validateSMSBundle(bundleId, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        return bundles.sms_bundles.bundles.some(
            bundle => bundle.id === bundleId
        );
    }

    _validateComboBundle(bundleId, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        return bundles.combo_bundles.bundles.some(
            bundle => bundle.id === bundleId
        );
    }

    _validateVoiceBundle(bundleId, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        return bundles.voice_bundles.bundles.some(
            bundle => bundle.id === bundleId
        );
    }

    getBundleById(bundleId, bundleType, category = null, currency = 'usd') {
        switch (bundleType) {
            case 'data':
                return this._getDataBundleById(bundleId, category, currency);
            case 'social_media':
                return this._getSocialMediaBundleById(bundleId, currency);
            case 'sms':
                return this._getSMSBundleById(bundleId, currency);
            case 'combo':
                return this._getComboBundleById(bundleId, currency);
            case 'voice':
                return this._getVoiceBundleById(bundleId, currency);
            default:
                return null;
        }
    }

    _getDataBundleById(bundleId, category, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        if (category) {
            const categoryData = bundles.data_bundles[category];
            if (!categoryData) return null;
            return categoryData.bundles.find(bundle => bundle.id === bundleId);
        }

        // Search all data bundle categories
        for (const categoryData of Object.values(bundles.data_bundles)) {
            const bundle = categoryData.bundles.find(bundle => bundle.id === bundleId);
            if (bundle) return bundle;
        }
        return null;
    }

    _getSocialMediaBundleById(bundleId, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        return bundles.social_media_bundles.bundles.find(
            bundle => bundle.id === bundleId
        );
    }

    _getSMSBundleById(bundleId, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        return bundles.sms_bundles.bundles.find(
            bundle => bundle.id === bundleId
        );
    }

    _getComboBundleById(bundleId, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        return bundles.combo_bundles.bundles.find(
            bundle => bundle.id === bundleId
        );
    }

    _getVoiceBundleById(bundleId, currency) {
        const bundles = this._getBundlesForCurrency(currency);
        return bundles.voice_bundles.bundles.find(
            bundle => bundle.id === bundleId
        );
    }
}

module.exports = new BundleService();