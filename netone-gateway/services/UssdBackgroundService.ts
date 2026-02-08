// services/UssdBackgroundService.ts
/**
 * USSD Background Service
 * 
 * NOTE: This is a TypeScript interface for the native USSD module.
 * For full background USSD processing, you need to:
 * 1. Eject from Expo: npx expo prebuild
 * 2. Add the native Android modules (UssdModule.java, UssdAccessibilityService.java)
 * 3. Update AndroidManifest.xml with required permissions
 * 
 * For now, this provides a fallback using the existing Linking API
 * with enhanced response handling via socket communication.
 */

import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import { UssdTaskDetails } from '@/types/types';

// Native module interface (will be implemented when ejected)
interface UssdNativeModule {
    executeUssd(code: string, steps: string[]): Promise<{ success: boolean; response?: string; error?: string }>;
    isAccessibilityEnabled(): Promise<boolean>;
    requestAccessibilityPermission(): void;
}

// Check if native module is available
const UssdModule = Platform.OS === 'android' ? NativeModules.UssdModule as UssdNativeModule | undefined : undefined;

export interface UssdBackgroundResult {
    success: boolean;
    response?: string;
    error?: string;
    usedNativeModule: boolean;
}

/**
 * Execute USSD in background using native module if available
 * Falls back to standard Linking API if native module not present
 */
export const executeUssdInBackground = async (
    taskDetails: UssdTaskDetails,
    onResponse?: (response: string) => void
): Promise<UssdBackgroundResult> => {
    if (Platform.OS !== 'android') {
        return {
            success: false,
            error: 'USSD automation only supported on Android',
            usedNativeModule: false
        };
    }

    // Try to use native module if available
    if (UssdModule) {
        try {
            const result = await UssdModule.executeUssd(
                taskDetails.code,
                taskDetails.steps || []
            );

            if (result.response && onResponse) {
                onResponse(result.response);
            }

            return {
                ...result,
                usedNativeModule: true
            };
        } catch (error: any) {
            console.error('Native USSD module error:', error);
            return {
                success: false,
                error: error.message,
                usedNativeModule: true
            };
        }
    }

    // Fallback: Native module not available
    return {
        success: false,
        error: 'Native USSD module not available. Please eject from Expo and add native modules.',
        usedNativeModule: false
    };
};

/**
 * Check if accessibility service is enabled (required for background USSD)
 */
export const checkAccessibilityPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !UssdModule) {
        return false;
    }

    try {
        return await UssdModule.isAccessibilityEnabled();
    } catch (error) {
        console.error('Error checking accessibility permission:', error);
        return false;
    }
};

/**
 * Request accessibility permission
 * Opens system settings for user to enable the service
 */
export const requestAccessibilityPermission = (): void => {
    if (Platform.OS !== 'android' || !UssdModule) {
        console.warn('Accessibility permission only available on Android with native module');
        return;
    }

    UssdModule.requestAccessibilityPermission();
};

/**
 * Listen for USSD responses from native module
 */
export const useUssdResponseListener = (
    onResponse: (response: string) => void
): (() => void) => {
    if (Platform.OS !== 'android' || !UssdModule) {
        return () => { };
    }

    const eventEmitter = new NativeEventEmitter(NativeModules.UssdModule);
    const subscription = eventEmitter.addListener('onUssdResponse', (event) => {
        if (event.response) {
            onResponse(event.response);
        }
    });

    return () => {
        subscription.remove();
    };
};

/**
 * Execute a USSD sequence and wait for the final response
 */
export const executeUssdSequence = (
    code: string,
    steps: string[],
    timeoutMs: number = 20000
): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        if (Platform.OS !== 'android' || !UssdModule) {
            return reject(new Error('USSD automation only supported on Android'));
        }

        const isAccEnabled = await checkAccessibilityPermission();
        if (!isAccEnabled) {
            return reject(new Error('Accessibility service not enabled'));
        }

        let responseCount = 0;
        const totalExpectedResponses = steps.length + 1;
        let timeout: NodeJS.Timeout;

        const unsubscribe = useUssdResponseListener((response) => {
            responseCount++;
            console.log(`Response ${responseCount}/${totalExpectedResponses}:`, response);

            if (responseCount === totalExpectedResponses) {
                clearTimeout(timeout);
                unsubscribe();
                resolve(response);
            }
        });

        timeout = setTimeout(() => {
            unsubscribe();
            reject(new Error('USSD request timed out'));
        }, timeoutMs);

        try {
            await UssdModule.executeUssd(code, steps);
        } catch (error) {
            clearTimeout(timeout);
            unsubscribe();
            reject(error);
        }
    });
};

export default {
    executeUssdInBackground,
    checkAccessibilityPermission,
    requestAccessibilityPermission,
    useUssdResponseListener
};
