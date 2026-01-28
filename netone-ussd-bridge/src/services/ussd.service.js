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
    
    // Get bundle details
    const bundle = bundleService.getBundleById(
        task.bundleId, 
        task.bundleType, 
        task.bundleCategory
    );

    if (!bundle) {
        throw new Error(`Bundle not found: ${task.bundleId}`);
    }

    // Build USSD task based on bundle type
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
        bundleId: task.bundleId
    };

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
    const categoryData = bundleService.getDataBundlesByCategory(task.bundleCategory);
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
        waitForConfirmation: buyingForOther
    };
};

const buildSocialMediaBundleTask = (baseTask, task, bundle) => {
    // Example implementation for social media bundles
    // This would need to be adjusted based on actual USSD flow
    const socialBundles = bundleService.getSocialMediaBundles();
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
    // Example implementation for SMS bundles
    const smsBundles = bundleService.getSMSBundles();
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
    // Example implementation for combo bundles
    const comboBundles = bundleService.getComboBundles();
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
    // Example implementation for voice bundles
    const voiceBundles = bundleService.getVoiceBundles();
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