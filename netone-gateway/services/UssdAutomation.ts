// services/UssdAutomation.ts

import { UssdTaskDetails } from '@/types/types';
import { Linking, Platform } from 'react-native';

export const initiateUssdDial = async (taskDetails: UssdTaskDetails): Promise<{ success: boolean; message: string }> => {
    // For full automation (clicking 'Send'), you must use a Native Module (Kotlin/Java)
    const ussdCode = `*171*3*2*${taskDetails.recipient}*${taskDetails.bundleType}#`;
    const url = `tel:${encodeURIComponent(ussdCode)}`;

    if (Platform.OS === 'android') {
        try {
            await Linking.openURL(url);
            return { success: true, message: "Dialing initiated, awaiting user confirmation." };
        } catch (err: any) {
            return { success: false, message: `Failed to dial: ${err.message}` };
        }
    }
    return { success: false, message: "Only supported on Android." };
};
