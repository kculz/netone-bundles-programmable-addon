// hooks/useSocketGateway.ts

import { useEffect } from 'react';
import socketService from '../services/SocketService';
import { initiateUssdDial } from '../services/UssdAutomation';
import { UssdTaskDetails } from '@/types/types';


export const useSocketGateway = () => {
    useEffect(() => {
        const handleNewTask = async (taskData: UssdTaskDetails) => {
            console.log("Processing task:", taskData.taskId);
            console.log("Task details:", JSON.stringify(taskData, null, 2));
            
            try {
                // Send progress update - task received
                socketService.emitProgress({
                    taskId: taskData.taskId,
                    step: 0,
                    message: 'Task received, initiating USSD dial'
                });

                // Initiate USSD dial
                const result = await initiateUssdDial(taskData);
                
                if (!result.success) {
                    // Send error if dial failed
                    socketService.emitError({
                        taskId: taskData.taskId,
                        error: result.message,
                        step: 0
                    });
                    return;
                }

                // Update status based on whether confirmation is needed
                if (taskData.waitForConfirmation) {
                    // For "buy for other" - request confirmation
                    socketService.emitConfirmationRequest({
                        taskId: taskData.taskId,
                        recipient: taskData.recipient,
                        bundleDetails: taskData.description || `${taskData.bundleType} bundle`
                    });

                    // Update to processing status
                    socketService.emitResult({
                        taskId: taskData.taskId,
                        status: 'PROCESSING',
                        message: 'USSD dialed, waiting for user confirmation on device'
                    });
                } else {
                    // For "buy for self" - assume success after dial
                    socketService.emitResult({
                        taskId: taskData.taskId,
                        status: 'PROCESSING',
                        message: 'USSD dialed successfully, awaiting completion'
                    });
                }

            } catch (error: any) {
                console.error("Error processing task:", error);
                socketService.emitError({
                    taskId: taskData.taskId,
                    error: error.message || 'Unknown error occurred',
                    step: 0
                });
            }
        };

        // Attach the typed listener
        socketService.onNewTask(handleNewTask);

        return () => {
            // Cleanup listener on unmount
            socketService.socket.off('NEW_USSD_TASK', handleNewTask);
        };
    }, []);
};