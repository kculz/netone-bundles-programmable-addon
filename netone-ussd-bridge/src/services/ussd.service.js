const bundleService = require('./bundle.service');

let phoneSocket = null;

const setPhoneSocket = (socket) => {
    phoneSocket = socket;
    console.log('Phone socket connected');
};

const sendToPhone = (task) => {
    if (!phoneSocket) {
        throw new Error("Android Gateway Offline");
    }

    let bundle = null;
    if (task.bundleType !== 'balance') {
        // Get bundle details
        bundle = bundleService.getBundleById(
            task.bundleId,
            task.bundleType,
            task.bundleCategory,
            task.currency // Pass currency to bundle service
        );

        if (!bundle) {
            throw new Error(`Bundle not found: ${task.bundleId} (${task.currency})`);
        }
    }

    // Build USSD task based on bundle type & currency
    const ussdTask = buildUSSDTask(task, bundle);

    // Send the USSD sequence instructions to the phone
    phoneSocket.emit('NEW_USSD_TASK', ussdTask);

    console.log(`USSD task sent to phone for task ${task.id}`);
};

const buildUSSDTask = (task, bundle) => {
    const baseTask = {
        taskId: task.id,
        recipient: task.recipient,
        bundleType: task.bundleType,
        bundleId: task.bundleId,
        currency: task.currency || 'USD'
    };

    if (task.bundleType === 'balance') {
        return buildBalanceTask(baseTask);
    }

    const currency = (task.currency || 'USD').toLowerCase();

    if (currency === 'zwl') {
        switch (task.bundleType) {
            case 'data':
                return buildZWLDataBundleTask(baseTask, task, bundle);
            case 'voice':
                return buildZWLVoiceBundleTask(baseTask, task, bundle);
            // Add other ZWL types here as needed
            default:
                throw new Error(`Unsupported ZWL bundle type: ${task.bundleType}`);
        }
    } else {
        // USD Flow
        switch (task.bundleType) {
            case 'data':
                return buildDataBundleTask(baseTask, task, bundle);
            case 'social_media':
                return buildSocialMediaBundleTask(baseTask, task, bundle);
            case 'sms':
                return buildSMSBundleTask(baseTask, task, bundle);
            case 'combo':
                return buildComboBundleTask(baseTask, task, bundle);
            case 'voice':
                return buildVoiceBundleTask(baseTask, task, bundle);
            default:
                throw new Error(`Unknown bundle type: ${task.bundleType}`);
        }
    }

};

const buildBalanceTask = (baseTask) => {
    const isZwl = baseTask.currency === 'ZWL';
    return {
        ...baseTask,
        code: isZwl ? "*171#" : "*379#",
        // ZWL: *171# -> 6 (Balance Inquiry) 
        // USD: *379# -> 3 (Balance Enquiry)
        steps: isZwl ? ["6"] : ["3"],
        description: `Check ${baseTask.currency} Balance`,
        waitForConfirmation: false,
        stepDelay: 800, // Delay between steps in ms
        stepTimeout: 10000 // Timeout per step in ms
    };
};

const buildZWLDataBundleTask = (baseTask, task, bundle) => {
    // ZWL Data Bundle Flow (*171#)
    // Assuming flow: *171# -> 1 (Data) -> Category -> Bundle -> 1 (Self)/2 (Other)

    const categoryMap = {
        'daily': '1', // Example mapping
        'weekly': '2',
        'monthly': '3'
    };

    const categoryOption = categoryMap[task.bundleCategory] || '1'; // Default to 1 if unknown

    // Find bundle index in its category
    const categoryData = bundleService.getDataBundlesByCategory(task.bundleCategory, 'zwl');
    const bundleIndex = categoryData ? categoryData.bundles.findIndex(b => b.id === task.bundleId) : -1;

    if (bundleIndex === -1) {
        // Fallback if not found via index, mostly for testing
        console.warn(`ZWL Bundle not found in category: ${task.bundleId}, defaulting to option 1`);
    }

    const bundleOption = (bundleIndex !== -1 ? bundleIndex + 1 : 1).toString();
    const buyingForOther = task.recipient !== 'self';

    return {
        ...baseTask,
        code: "*171#",
        steps: buyingForOther
            ? ["1", categoryOption, bundleOption, "2", task.recipient]
            : ["1", categoryOption, bundleOption, "1"],
        description: `Purchase ${bundle.name} (ZWL) for ${buyingForOther ? task.recipient : 'self'}`,
        waitForConfirmation: buyingForOther,
        stepDelay: 800,
        stepTimeout: 10000
    };
};

const buildZWLVoiceBundleTask = (baseTask, task, bundle) => {
    // ZWL Voice Bundle Flow (*171#)
    // Assuming flow: *171# -> 2 (Voice) -> Bundle -> 1 (Self)/2 (Other)

    const voiceBundles = bundleService.getVoiceBundles('zwl');
    const bundleIndex = voiceBundles.bundles.findIndex(b => b.id === task.bundleId);
    const bundleOption = (bundleIndex !== -1 ? bundleIndex + 1 : 1).toString();

    const buyingForOther = task.recipient !== 'self';

    return {
        ...baseTask,
        code: "*171#",
        steps: buyingForOther
            ? ["2", bundleOption, "2", task.recipient]
            : ["2", bundleOption, "1"],
        description: `Purchase ${bundle.name} (ZWL) for ${buyingForOther ? task.recipient : 'self'}`,
        waitForConfirmation: buyingForOther
    };
};

const buildDataBundleTask = (baseTask, task, bundle) => {
    // Map category to USSD menu option
    const categoryMap = {
        'bbb': '1',
        'mogigs': '2',
        'night': '3',
        'daily': '4',
        'weekly': '5',
        'hourly': '6'
    };

    const categoryOption = categoryMap[task.bundleCategory];
    if (!categoryOption) {
        throw new Error(`Unknown data bundle category: ${task.bundleCategory}`);
    }

    // Find bundle index in its category
    const categoryData = bundleService.getDataBundlesByCategory(task.bundleCategory, 'usd');
    const bundleIndex = categoryData.bundles.findIndex(b => b.id === task.bundleId);

    if (bundleIndex === -1) {
        throw new Error(`Bundle not found in category: ${task.bundleId}`);
    }

    const bundleOption = (bundleIndex + 1).toString();

    // Determine if buying for self or other
    const buyingForOther = task.recipient !== 'self';

    return {
        ...baseTask,
        code: "*379#",
        steps: buyingForOther
            ? ["1", "1", "1", categoryOption, bundleOption, "2", task.recipient]
            : ["1", "1", "1", categoryOption, bundleOption, "1"],
        description: `Purchase ${bundle.name} for ${buyingForOther ? task.recipient : 'self'}`,
        waitForConfirmation: buyingForOther,
        stepDelay: 800,
        stepTimeout: 10000
    };
};

const buildSocialMediaBundleTask = (baseTask, task, bundle) => {
    const socialBundles = bundleService.getSocialMediaBundles('usd');
    const bundleIndex = socialBundles.bundles.findIndex(b => b.id === task.bundleId);

    if (bundleIndex === -1) {
        throw new Error(`Social media bundle not found: ${task.bundleId}`);
    }

    const bundleOption = (bundleIndex + 1).toString();
    const buyingForOther = task.recipient !== 'self';

    return {
        ...baseTask,
        code: "*379#",
        steps: buyingForOther
            ? ["1", "1", "2", bundleOption, "2", task.recipient]
            : ["1", "1", "2", bundleOption, "1"],
        description: `Purchase ${bundle.name} for ${buyingForOther ? task.recipient : 'self'}`,
        waitForConfirmation: buyingForOther
    };
};

const buildSMSBundleTask = (baseTask, task, bundle) => {
    const smsBundles = bundleService.getSMSBundles('usd');
    const bundleIndex = smsBundles.bundles.findIndex(b => b.id === task.bundleId);

    if (bundleIndex === -1) {
        throw new Error(`SMS bundle not found: ${task.bundleId}`);
    }

    const bundleOption = (bundleIndex + 1).toString();
    const buyingForOther = task.recipient !== 'self';

    return {
        ...baseTask,
        code: "*379#",
        steps: buyingForOther
            ? ["1", "1", "3", bundleOption, "2", task.recipient]
            : ["1", "1", "3", bundleOption, "1"],
        description: `Purchase ${bundle.name} for ${buyingForOther ? task.recipient : 'self'}`,
        waitForConfirmation: buyingForOther
    };
};

const buildComboBundleTask = (baseTask, task, bundle) => {
    const comboBundles = bundleService.getComboBundles('usd');
    const bundleIndex = comboBundles.bundles.findIndex(b => b.id === task.bundleId);

    if (bundleIndex === -1) {
        throw new Error(`Combo bundle not found: ${task.bundleId}`);
    }

    const bundleOption = (bundleIndex + 1).toString();
    const buyingForOther = task.recipient !== 'self';

    return {
        ...baseTask,
        code: "*379#",
        steps: buyingForOther
            ? ["1", "1", "4", bundleOption, "2", task.recipient]
            : ["1", "1", "4", bundleOption, "1"],
        description: `Purchase ${bundle.name} for ${buyingForOther ? task.recipient : 'self'}`,
        waitForConfirmation: buyingForOther
    };
};

const buildVoiceBundleTask = (baseTask, task, bundle) => {
    const voiceBundles = bundleService.getVoiceBundles('usd');
    const bundleIndex = voiceBundles.bundles.findIndex(b => b.id === task.bundleId);

    if (bundleIndex === -1) {
        throw new Error(`Voice bundle not found: ${task.bundleId}`);
    }

    const bundleOption = (bundleIndex + 1).toString();
    const buyingForOther = task.recipient !== 'self';

    return {
        ...baseTask,
        code: "*379#",
        steps: buyingForOther
            ? ["1", "1", "5", bundleOption, "2", task.recipient]
            : ["1", "1", "5", bundleOption, "1"],
        description: `Purchase ${bundle.name} for ${buyingForOther ? task.recipient : 'self'}`,
        waitForConfirmation: buyingForOther
    };
};

module.exports = {
    setPhoneSocket,
    sendToPhone
};