// ./types/types.ts 

export interface UssdTaskDetails {
    taskId: string;
    recipient: string;
    bundleType: 'data' | 'social_media' | 'sms' | 'combo' | 'voice';
    bundleId: string;
    code: string;
    steps: string[];
    description?: string;
    waitForConfirmation: boolean;
}

export interface TaskResult {
    taskId: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    message: string;
    error?: string;
}

export interface TaskProgress {
    taskId: string;
    step: number;
    message: string;
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