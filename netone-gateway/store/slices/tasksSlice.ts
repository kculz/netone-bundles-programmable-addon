import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Task {
    taskId: string;
    status: 'PENDING' | 'PENDING_CONFIRMATION' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    description?: string;
    message?: string; // Latest message from USSD/Server
    timestamp: number;
}

interface TasksState {
    items: Task[];
    executingTaskId: string | null;
}

const initialState: TasksState = {
    items: [],
    executingTaskId: null,
};

const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        addTask: (state, action: PayloadAction<Task>) => {
            const exists = state.items.find(t => t.taskId === action.payload.taskId);
            if (!exists) {
                state.items.unshift(action.payload);
            }
        },
        updateTaskStatus: (state, action: PayloadAction<{ taskId: string; status: Task['status']; message?: string }>) => {
            const task = state.items.find(t => t.taskId === action.payload.taskId);
            if (task) {
                task.status = action.payload.status;
                if (action.payload.message) {
                    task.message = action.payload.message;
                }

                // Update executing state
                if (action.payload.status === 'PROCESSING') {
                    state.executingTaskId = task.taskId;
                } else if (state.executingTaskId === task.taskId && (action.payload.status === 'COMPLETED' || action.payload.status === 'FAILED')) {
                    state.executingTaskId = null;
                }
            }
        },
        // To handle incoming queue list if we fetch it
        setTasks: (state, action: PayloadAction<Task[]>) => {
            state.items = action.payload;
        }
    },
});

export const { addTask, updateTaskStatus, setTasks } = tasksSlice.actions;
export default tasksSlice.reducer;
