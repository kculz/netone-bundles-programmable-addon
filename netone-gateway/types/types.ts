// ./types/types.ts 

export interface UssdTaskDetails {
    taskId: string;
    recipient: string;
    bundleType: string;
}

export interface TaskResult {
    taskId: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    message: string;
}
