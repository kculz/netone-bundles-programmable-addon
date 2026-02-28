// hooks/useSocketGateway.ts

import { useEffect } from 'react';
import socketService from '../services/SocketService';
import { initiateUssdDial } from '../services/UssdAutomation';
import { UssdTaskDetails } from '@/types/types';


export const useSocketGateway = () => {
    useEffect(() => {
        const handleNewTask = async (taskData: UssdTaskDetails) => {
            console.log("Processing task:", taskData.taskId);
            const result = await initiateUssdDial(taskData);
            
            socketService.emitResult({
                taskId: taskData.taskId,
                status: result.success ? 'PROCESSING' : 'FAILED',
                message: result.message
            });
        };

        // Attach the typed listener
        socketService.onNewTask(handleNewTask);

        return () => {
            // Cleanup listener on unmount
            socketService.socket.off('NEW_USSD_TASK', handleNewTask);
        };
    }, []);
};
