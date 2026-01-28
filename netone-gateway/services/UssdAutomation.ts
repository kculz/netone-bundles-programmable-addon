// services/UssdAutomation.ts

import { UssdTaskDetails } from '@/types/types';
import { Linking, Platform } from 'react-native';

export const initiateUssdDial = async (taskDetails: UssdTaskDetails): Promise<{ success: boolean; message: string }> => {
    // Build the USSD code with all steps
    const ussdCode = buildUssdCode(taskDetails);
    const url = `tel:${encodeURIComponent(ussdCode)}`;

    if (Platform.OS === 'android') {
        try {
            const canOpen = await Linking.canOpenURL(url);
            
            if (!canOpen) {
                return { 
                    success: false, 
                    message: "Device cannot open USSD codes" 
                };
            }

            await Linking.openURL(url);
            
            return { 
                success: true, 
                message: taskDetails.waitForConfirmation 
                    ? "USSD dialed. Waiting for user to confirm on device." 
                    : "USSD dialed successfully. Processing..." 
            };
        } catch (err: any) {
            return { 
                success: false, 
                message: `Failed to dial USSD: ${err.message}` 
            };
        }
    }
    
    return { 
        success: false, 
        message: "USSD automation is only supported on Android." 
    };
};

const buildUssdCode = (taskDetails: UssdTaskDetails): string => {
    // Start with the base USSD code
    let code = taskDetails.code;
    
    // Append each step with * separator
    if (taskDetails.steps && taskDetails.steps.length > 0) {
        const stepsString = taskDetails.steps.join('*');
        code += `*${stepsString}`;
    }
    
    // End with #
    code += '#';
    
    console.log('Built USSD code:', code);
    console.log('For task:', taskDetails.taskId);
    console.log('Description:', taskDetails.description);
    
    return code;
};

// Helper function to format phone numbers if needed
export const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 263, keep it
    // If it starts with 0, replace with 263
    if (cleaned.startsWith('0')) {
        cleaned = '263' + cleaned.substring(1);
    }
    
    // If it doesn't start with 263, assume it's missing country code
    if (!cleaned.startsWith('263')) {
        cleaned = '263' + cleaned;
    }
    
    return cleaned;
};

// Example of how to handle USSD steps manually (for advanced use cases)
export const executeUssdSteps = async (
    baseCode: string, 
    steps: string[], 
    onStep?: (step: number, message: string) => void
): Promise<{ success: boolean; message: string }> => {
    // This is a placeholder for potential future enhancement
    // where we might need to execute USSD steps one by one
    // Currently, Android USSD limitation means we send all steps at once
    
    if (onStep) {
        steps.forEach((step, index) => {
            onStep(index + 1, `Executing step ${index + 1}: ${step}`);
        });
    }
    
    return initiateUssdDial({
        taskId: '',
        recipient: '',
        bundleType: 'data',
        bundleId: '',
        code: baseCode,
        steps: steps,
        waitForConfirmation: false
    });
};