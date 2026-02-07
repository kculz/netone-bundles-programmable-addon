// services/PermissionService.ts

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

export interface PermissionResult {
    granted: boolean;
    message: string;
    isBlocked?: boolean; // True if 'never_ask_again'
    isExpoGo?: boolean;   // True if running in Expo Go
}

/**
 * Request CALL_PHONE permission required for USSD dialing
 */
export const requestCallPermission = async (): Promise<PermissionResult> => {
    if (Platform.OS !== 'android') {
        return {
            granted: false,
            message: 'USSD automation is only supported on Android'
        };
    }

    try {
        const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            {
                title: 'Phone Call Permission',
                message: 'NetOne Gateway needs permission to make phone calls for USSD automation',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            }
        );

        console.log(`Permission request result for CALL_PHONE: ${status}`);

        if (status === PermissionsAndroid.RESULTS.GRANTED) {
            return {
                granted: true,
                message: 'Call permission granted'
            };
        } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            return {
                granted: false,
                isBlocked: true,
                message: 'Call permission is blocked. Please enable it in Settings.'
            };
        } else {
            return {
                granted: false,
                message: `Call permission ${status}. USSD automation will not work.`
            };
        }
    } catch (err) {
        console.error('Error requesting call permission:', err);
        return {
            granted: false,
            message: `Permission request failed: ${err}`
        };
    }
};

/**
 * Check if CALL_PHONE permission is already granted
 */
export const checkCallPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return false;
    }

    try {
        const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE
        );
        console.log(`Checking CALL_PHONE permission: ${granted}`);
        return granted === true;
    } catch (err) {
        console.error('Error checking call permission:', err);
        return false;
    }
};

/**
 * Request READ_PHONE_STATE permission (optional, for better error handling)
 */
export const requestPhoneStatePermission = async (): Promise<PermissionResult> => {
    if (Platform.OS !== 'android') {
        return {
            granted: false,
            message: 'Only supported on Android'
        };
    }

    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            {
                title: 'Phone State Permission',
                message: 'NetOne Gateway needs permission to monitor phone state for better USSD handling',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
            }
        );

        return {
            granted: granted === PermissionsAndroid.RESULTS.GRANTED,
            message: granted === PermissionsAndroid.RESULTS.GRANTED
                ? 'Phone state permission granted'
                : 'Phone state permission denied'
        };
    } catch (err) {
        console.error('Error requesting phone state permission:', err);
        return {
            granted: false,
            message: `Permission request failed: ${err}`
        };
    }
};

/**
 * Request all required permissions at once
 */
export const requestAllPermissions = async (): Promise<PermissionResult> => {
    if (Platform.OS !== 'android') {
        return {
            granted: false,
            message: 'USSD automation is only supported on Android'
        };
    }

    // Check if running in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
        console.warn('Running in Expo Go. CALL_PHONE permission is restricted.');
        return {
            granted: false,
            isExpoGo: true,
            message: 'Expo Go restricts "Phone Call" permissions. You need to create a Development Build or Eject to automate USSD.'
        };
    }

    try {
        console.log('Requesting all permissions: CALL_PHONE, READ_PHONE_STATE');
        const results = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ]);

        console.log('Permission results:', JSON.stringify(results));

        const callStatus = results[PermissionsAndroid.PERMISSIONS.CALL_PHONE];
        const phoneStatus = results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE];

        const callGranted = callStatus === PermissionsAndroid.RESULTS.GRANTED;
        const phoneStateGranted = phoneStatus === PermissionsAndroid.RESULTS.GRANTED;

        if (callGranted) {
            return {
                granted: true,
                message: phoneStateGranted
                    ? 'All permissions granted'
                    : 'Call permission granted (phone state optional)'
            };
        } else {
            const isBlocked = callStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
            return {
                granted: false,
                isBlocked,
                message: isBlocked
                    ? 'Call permission is blocked. Please enable it in App Settings.'
                    : `Call permission is ${callStatus}. Please enable it in Settings.`
            };
        }
    } catch (err) {
        console.error('Error requesting permissions:', err);
        return {
            granted: false,
            message: `Permission request failed: ${err}`
        };
    }
};

/**
 * Open Android app settings so user can manually grant permissions
 */
export const openAppSettings = () => {
    if (Platform.OS === 'android') {
        Linking.openSettings();
    }
};

/**
 * Show alert when permissions are denied
 */
export const showPermissionDeniedAlert = () => {
    Alert.alert(
        'Permissions Required',
        'NetOne Gateway needs phone call permissions to automate USSD operations. Please grant permissions in app settings.',
        [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Open Settings',
                onPress: () => openAppSettings()
            }
        ]
    );
};
