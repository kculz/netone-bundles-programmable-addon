const bundlesData = require('../utils/bundles.json');

class BundleService {
    constructor() {
        this.bundles = bundlesData.bundle_catalog;
    }

    getAllBundles() {
        return {
            data_bundles: this.getDataBundles(),
            social_media_bundles: this.getSocialMediaBundles(),
            sms_bundles: this.getSMSBundles(),
            combo_bundles: this.getComboBundles(),
            voice_bundles: this.getVoiceBundles()
        };
    }

    getDataBundles() {
        const categories = this.bundles.data_bundles;
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

    getDataBundlesByCategory(category) {
        const categoryData = this.bundles.data_bundles[category];
        
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

    getSocialMediaBundles() {
        return {
            category_name: this.bundles.social_media_bundles.category_name,
            bundles: this.bundles.social_media_bundles.bundles
        };
    }

    getSMSBundles() {
        return {
            category_name: this.bundles.sms_bundles.category_name,
            bundles: this.bundles.sms_bundles.bundles
        };
    }

    getComboBundles() {
        return {
            category_name: this.bundles.combo_bundles.category_name,
            description: this.bundles.combo_bundles.description,
            bundles: this.bundles.combo_bundles.bundles
        };
    }

    getVoiceBundles() {
        return {
            category_name: this.bundles.voice_bundles.category_name,
            bundles: this.bundles.voice_bundles.bundles
        };
    }

    validateBundle(bundleId, bundleType, category = null) {
        switch (bundleType) {
            case 'data':
                return this._validateDataBundle(bundleId, category);
            case 'social_media':
                return this._validateSocialMediaBundle(bundleId);
            case 'sms':
                return this._validateSMSBundle(bundleId);
            case 'combo':
                return this._validateComboBundle(bundleId);
            case 'voice':
                return this._validateVoiceBundle(bundleId);
            default:
                return false;
        }
    }

    _validateDataBundle(bundleId, category) {
        if (category) {
            const categoryData = this.bundles.data_bundles[category];
            if (!categoryData) return false;
            return categoryData.bundles.some(bundle => bundle.id === bundleId);
        }

        // Search all data bundle categories
        for (const categoryData of Object.values(this.bundles.data_bundles)) {
            if (categoryData.bundles.some(bundle => bundle.id === bundleId)) {
                return true;
            }
        }
        return false;
    }

    _validateSocialMediaBundle(bundleId) {
        return this.bundles.social_media_bundles.bundles.some(
            bundle => bundle.id === bundleId
        );
    }

    _validateSMSBundle(bundleId) {
        return this.bundles.sms_bundles.bundles.some(
            bundle => bundle.id === bundleId
        );
    }

    _validateComboBundle(bundleId) {
        return this.bundles.combo_bundles.bundles.some(
            bundle => bundle.id === bundleId
        );
    }

    _validateVoiceBundle(bundleId) {
        return this.bundles.voice_bundles.bundles.some(
            bundle => bundle.id === bundleId
        );
    }

    getBundleById(bundleId, bundleType, category = null) {
        switch (bundleType) {
            case 'data':
                return this._getDataBundleById(bundleId, category);
            case 'social_media':
                return this._getSocialMediaBundleById(bundleId);
            case 'sms':
                return this._getSMSBundleById(bundleId);
            case 'combo':
                return this._getComboBundleById(bundleId);
            case 'voice':
                return this._getVoiceBundleById(bundleId);
            default:
                return null;
        }
    }

    _getDataBundleById(bundleId, category) {
        if (category) {
            const categoryData = this.bundles.data_bundles[category];
            if (!categoryData) return null;
            return categoryData.bundles.find(bundle => bundle.id === bundleId);
        }

        // Search all data bundle categories
        for (const categoryData of Object.values(this.bundles.data_bundles)) {
            const bundle = categoryData.bundles.find(bundle => bundle.id === bundleId);
            if (bundle) return bundle;
        }
        return null;
    }

    _getSocialMediaBundleById(bundleId) {
        return this.bundles.social_media_bundles.bundles.find(
            bundle => bundle.id === bundleId
        );
    }

    _getSMSBundleById(bundleId) {
        return this.bundles.sms_bundles.bundles.find(
            bundle => bundle.id === bundleId
        );
    }

    _getComboBundleById(bundleId) {
        return this.bundles.combo_bundles.bundles.find(
            bundle => bundle.id === bundleId
        );
    }

    _getVoiceBundleById(bundleId) {
        return this.bundles.voice_bundles.bundles.find(
            bundle => bundle.id === bundleId
        );
    }
}

module.exports = new BundleService();