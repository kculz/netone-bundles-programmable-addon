// ./types/types.ts 

export interface UssdTaskDetails {
    taskId: string;
    recipient: string;
    bundleType: 'data' | 'social_media' | 'sms' | 'combo' | 'voice' | 'balance';
    bundleId: string;
    code: string;
    steps: string[];
    description?: string;
    waitForConfirmation: boolean;
    currency?: string;
}

export interface TaskResult {
    taskId: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    message: string;
    error?: string;
    rawResponse?: string; // Raw USSD response text for parsing
}

export interface TaskProgress {
    taskId: string;
    step: number;
    message: string;
    rawResponse?: string; // Intermediate USSD responses
}

export interface TaskError {
    taskId: string;
    error: string;
    step: number;
}

export interface ConfirmationRequest {
    taskId: string;
    recipient: string;
    bundleDetails: string;
}