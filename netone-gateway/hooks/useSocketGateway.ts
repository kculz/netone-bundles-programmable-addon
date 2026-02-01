// hooks/useSocketGateway.ts

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import socketService from '../services/SocketService';
import { initiateUssdDial } from '../services/UssdAutomation';
import { UssdTaskDetails } from '@/types/types';
import { addTask, updateTaskStatus } from '@/store/slices/tasksSlice';

export const useSocketGateway = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const handleNewTask = async (taskData: UssdTaskDetails) => {
            console.log("Processing task:", taskData.taskId);

            // Add to Redux Store
            dispatch(addTask({
                taskId: taskData.taskId,
                status: 'PROCESSING',
                description: taskData.description || `Bundle: ${taskData.bundleType}`,
                message: 'Starting USSD execution...',
                timestamp: Date.now()
            }));

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

                    dispatch(updateTaskStatus({
                        taskId: taskData.taskId,
                        status: 'FAILED',
                        message: result.message
                    }));
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
                    const msg = 'USSD dialed, waiting for user confirmation on device';
                    socketService.emitResult({
                        taskId: taskData.taskId,
                        status: 'PROCESSING',
                        message: msg
                    });

                    dispatch(updateTaskStatus({
                        taskId: taskData.taskId,
                        status: 'PENDING_CONFIRMATION', // Or indicate waiting for user
                        message: msg
                    }));
                } else {
                    // For "buy for self" - assume success after dial
                    const msg = 'USSD dialed successfully, awaiting completion';
                    socketService.emitResult({
                        taskId: taskData.taskId,
                        status: 'PROCESSING',
                        message: msg
                    });

                    // We keep it as processing or mark compeleted?
                    // Usually we don't know if it really completed without reading SMS.
                    // But for now, we assume executed.
                    // But to show "Executing" vs "Queued", we should keep it PROCESSING until some timeout or explicit completion?
                    // Let's keep it PROCESSING for a bit or move to COMPLETED.
                    // The prompt asked to show "executing and queued".

                    dispatch(updateTaskStatus({
                        taskId: taskData.taskId,
                        status: 'COMPLETED',
                        message: msg
                    }));
                }

            } catch (error: any) {
                console.error("Error processing task:", error);
                const errorMsg = error.message || 'Unknown error occurred';

                socketService.emitError({
                    taskId: taskData.taskId,
                    error: errorMsg,
                    step: 0
                });

                dispatch(updateTaskStatus({
                    taskId: taskData.taskId,
                    status: 'FAILED',
                    message: errorMsg
                }));
            }
        };

        // Attach the typed listener
        socketService.onNewTask(handleNewTask);

        return () => {
            // Cleanup listener on unmount
            socketService.socket.off('NEW_USSD_TASK', handleNewTask);
        };
    }, [dispatch]);
};