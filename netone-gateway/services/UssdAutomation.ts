// services/UssdAutomation.ts

import { UssdTaskDetails } from '@/types/types';
import { Linking, Platform } from 'react-native';
import { checkCallPermission } from './PermissionService';
import { executeUssdForeground } from './UssdBackgroundService';

// Configuration for USSD execution
const USSD_CONFIG = {
    STEP_DELAY: 800, // Delay between steps in milliseconds (NetOne requirement)
    DIAL_TIMEOUT: 10000, // Timeout for each dial operation
    MAX_RETRIES: 2, // Number of retries for failed operations
};

export interface UssdExecutionResult {
    success: boolean;
    message: string;
    currentStep?: number;
    totalSteps?: number;
}

/**
 * Main function to initiate USSD dial with sequential step execution
 * NetOne requires steps to be sent one at a time, not all at once
 */
export const initiateUssdDial = async (
    taskDetails: UssdTaskDetails,
    onProgress?: (step: number, total: number, message: string) => void
): Promise<UssdExecutionResult> => {
    if (Platform.OS !== 'android') {
        return {
            success: false,
            message: 'USSD automation is only supported on Android'
        };
    }

    // Check permissions with progress reporting
    onProgress?.(0, (taskDetails.steps?.length || 0) + 1, 'Checking phone permissions...');

    const hasPermission = await checkCallPermission();
    if (!hasPermission) {
        console.error('USSD Permission Error: Call permission missing');
        return {
            success: false,
            message: 'Call permission missing. Please grant it in the app settings first.'
        };
    }


    onProgress?.(0, (taskDetails.steps?.length || 0) + 1, 'Starting USSD execution...');

    try {
        // Try interactive foreground execution (no accessibility required, Android 8+)
        if (Platform.OS === 'android') {
            onProgress?.(0, (taskDetails.steps?.length || 0) + 1, 'Using interactive foreground mode...');
            const interactiveResult = await executeUssdInteractively(taskDetails, onProgress);
            if (interactiveResult.success) {
                return interactiveResult;
            }
            console.log('Interactive foreground execution failed or unsupported, falling back to sequential dialer...');
        }

        // Fallback or secondary: Execute USSD steps sequentially via Linking
        const result = await executeUssdSequentially(taskDetails, onProgress);
        return result;
    } catch (err: any) {
        console.error('USSD execution error:', err);
        return {
            success: false,
            message: `USSD execution failed: ${err.message}`
        };
    }
};


/**
 * Execute USSD steps one at a time with delays between each step
 * This is required for NetOne provider compatibility
 */
const executeUssdSequentially = async (
    taskDetails: UssdTaskDetails,
    onProgress?: (step: number, total: number, message: string) => void
): Promise<UssdExecutionResult> => {
    const { code, steps } = taskDetails;

    // Step 1: Dial the base USSD code (e.g., *379# or *171#)
    const baseDialResult = await dialUssdCode(code);
    if (!baseDialResult.success) {
        return baseDialResult;
    }

    onProgress?.(0, steps.length + 1, `Dialed ${code}`);

    // If no steps, we're done (e.g., just checking balance)
    if (!steps || steps.length === 0) {
        return {
            success: true,
            message: taskDetails.waitForConfirmation
                ? 'USSD dialed. Please confirm on device.'
                : 'USSD dialed successfully',
            currentStep: 1,
            totalSteps: 1
        };
    }

    // Step 2: Send each menu selection sequentially
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNumber = i + 1;

        // Wait before sending next step (NetOne requirement)
        await delay(USSD_CONFIG.STEP_DELAY);

        onProgress?.(stepNumber, steps.length + 1, `Sending step ${stepNumber}: ${step}`);

        // For sequential execution, we dial the step as a USSD code
        // This simulates pressing the menu option
        const stepResult = await dialUssdCode(`${step}#`);

        if (!stepResult.success) {
            return {
                success: false,
                message: `Failed at step ${stepNumber}: ${stepResult.message}`,
                currentStep: stepNumber,
                totalSteps: steps.length + 1
            };
        }
    }

    // All steps completed
    const finalMessage = taskDetails.waitForConfirmation
        ? 'All steps sent. Please confirm the transaction on your device.'
        : 'USSD sequence completed successfully';

    return {
        success: true,
        message: finalMessage,
        currentStep: steps.length + 1,
        totalSteps: steps.length + 1
    };
};

/**
 * Execute USSD sequence interactively using TelephonyManager
 * This captures responses and appends steps to the dial string
 */
const executeUssdInteractively = async (
    taskDetails: UssdTaskDetails,
    onProgress?: (step: number, total: number, message: string) => void
): Promise<UssdExecutionResult> => {
    const { code, steps } = taskDetails;
    let currentFullCode = code;
    let lastResponse = '';

    try {
        // Step 1: Base dial
        console.log(`Interactive Dial: ${currentFullCode}`);
        const initialResult = await executeUssdForeground(currentFullCode);

        if (!initialResult.success) {
            return {
                success: false,
                message: initialResult.error || 'Interactive USSD failed'
            };
        }

        lastResponse = initialResult.response || '';
        onProgress?.(0, steps.length + 1, lastResponse);

        // If no steps, we're done
        if (!steps || steps.length === 0) {
            return {
                success: true,
                message: lastResponse || 'USSD dialed successfully'
            };
        }

        // Sub-steps: Appending approach (specific to many USSD providers like NetOne)
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepNumber = i + 1;

            // Wait slightly between attempts
            await delay(USSD_CONFIG.STEP_DELAY);

            // Build the next code by appending (e.g., *379# -> *379*1#)
            let baseWithoutHash = currentFullCode.endsWith('#')
                ? currentFullCode.slice(0, -1)
                : currentFullCode;

            currentFullCode = `${baseWithoutHash}*${step}#`;

            onProgress?.(stepNumber, steps.length + 1, `Auto-filling step ${stepNumber}: ${step}...`);
            console.log(`Interactive Step ${stepNumber}: ${currentFullCode}`);

            const stepResult = await executeUssdForeground(currentFullCode);

            if (!stepResult.success) {
                // If appending fails, we might be at the end of a session or provider doesn't support it
                console.warn(`Appending failed at ${currentFullCode}: ${stepResult.error}`);
                return {
                    success: false,
                    message: `Failed at step ${stepNumber}: ${stepResult.error}`,
                    currentStep: stepNumber
                };
            }

            lastResponse = stepResult.response || '';
            onProgress?.(stepNumber, steps.length + 1, lastResponse);
        }

        return {
            success: true,
            message: lastResponse || 'USSD sequence completed successfully'
        };
    } catch (err: any) {
        console.error('executeUssdInteractively error:', err);
        return {
            success: false,
            message: `Interactive error: ${err.message}`
        };
    }
};

/**
 * Dial a single USSD code
 */
const dialUssdCode = async (code: string): Promise<UssdExecutionResult> => {
    const url = `tel:${encodeURIComponent(code)}`;

    try {
        console.log(`Attempting to dial USSD: ${code}`);

        // Android 11+ might require <queries> in AndroidManifest.xml for canOpenURL to return true
        // and some devices might not have a default dialer configured correctly.
        // We'll try to open anyway if canOpenURL fails but doesn't throw.
        let canOpen = false;
        try {
            canOpen = await Linking.canOpenURL(url);
        } catch (e) {
            console.warn('canOpenURL check failed:', e);
        }

        if (!canOpen && Platform.OS === 'android') {
            console.log('canOpenURL returned false, attempting to dial anyway...');
            // On Android, we can often still try to open the URL
        }

        await Linking.openURL(url);

        return {
            success: true,
            message: `Dialed ${code}`
        };
    } catch (err: any) {
        console.error(`Failed to dial ${code}:`, err);
        return {
            success: false,
            message: `Failed to dial ${code}: ${err.message}`
        };
    }
};

/**
 * Fallback: Build complete USSD code (old approach - kept for compatibility)
 * This sends all steps at once, which may not work with NetOne
 */
export const buildCompleteUssdCode = (taskDetails: UssdTaskDetails): string => {
    let code = taskDetails.code;

    if (taskDetails.steps && taskDetails.steps.length > 0) {
        const stepsString = taskDetails.steps.join('*');
        code += `*${stepsString}`;
    }

    code += '#';

    console.log('Built complete USSD code:', code);
    return code;
};

/**
 * Fallback: Execute USSD with all steps at once (old approach)
 * Use this only if sequential execution fails
 */
export const executeUssdAllAtOnce = async (
    taskDetails: UssdTaskDetails
): Promise<UssdExecutionResult> => {
    const ussdCode = buildCompleteUssdCode(taskDetails);
    const result = await dialUssdCode(ussdCode);

    return {
        ...result,
        message: result.success
            ? 'USSD dialed with all steps (fallback mode)'
            : result.message
    };
};

export const getNetOneMenu = async (): Promise<string> => {
    // Sequence: Dial *379#, then send "1", "1", "1"
    const result = await initiateUssdDial({
        taskId: 'get-menu-' + Date.now(),
        code: '*379#',
        steps: ['1', '1', '1'],
        bundleType: 'NETONE_MENU',
        bundleId: 'menu',
        waitForConfirmation: false
    });

    if (!result.success) {
        throw new Error(result.message);
    }
    return result.message;
};

export const getNetOneUSDBalance = async (): Promise<string> => {
    // Sequence: Dial *379#, then send "1", "1", "3", "2"
    const result = await initiateUssdDial({
        taskId: 'get-balance-' + Date.now(),
        code: '*379#',
        steps: ['1', '1', '3', '2'],
        bundleType: 'NETONE_BALANCE',
        bundleId: 'balance',
        waitForConfirmation: false
    });

    if (!result.success) {
        throw new Error(result.message);
    }
    return result.message;
};

/**
 * Helper function to format phone numbers
 */
export const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
        cleaned = '263' + cleaned.substring(1);
    }

    if (!cleaned.startsWith('263')) {
        cleaned = '263' + cleaned;
    }

    return cleaned;
};

/**
 * Delay utility function
 */
const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get USSD configuration (can be customized per task if needed)
 */
export const getUssdConfig = () => {
    return { ...USSD_CONFIG };
};

/**
 * Update USSD configuration (for testing or customization)
 */
export const updateUssdConfig = (config: Partial<typeof USSD_CONFIG>) => {
    Object.assign(USSD_CONFIG, config);
};