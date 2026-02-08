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

// Native module interface (will be implemented when ejected)
interface UssdNativeModule {
    executeInteractiveUssd(code: string): Promise<{ success: boolean; response?: string; error?: string }>;
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
 * Execute USSD in foreground using TelephonyManager.sendUssdRequest
 * This doesn't require accessibility permissions but works on Android 8+
 */
export const executeUssdForeground = async (
    code: string
): Promise<UssdBackgroundResult> => {
    if (Platform.OS !== 'android' || !UssdModule) {
        return {
            success: false,
            error: 'Interactive USSD not available on this platform',
            usedNativeModule: false
        };
    }

    try {
        const result = await UssdModule.executeInteractiveUssd(code);
        return {
            ...result,
            usedNativeModule: true
        };
    } catch (error: any) {
        console.error('Interactive USSD error:', error);
        return {
            success: false,
            error: error.message,
            usedNativeModule: true
        };
    }
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


export default {
    executeUssdForeground,
    useUssdResponseListener
};
