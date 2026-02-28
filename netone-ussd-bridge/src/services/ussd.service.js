let phoneSocket = null;

const setPhoneSocket = (socket) => { phoneSocket = socket; };

const sendToPhone = (task) => {
    if (!phoneSocket) throw new Error("Android Gateway Offline");
    
    // Send the USSD sequence instructions to the phone
    phoneSocket.emit('NEW_USSD_TASK', {
        taskId: task.id,
        code: "*171#",
        steps: ["3", "2", task.recipient, task.bundleType] 
    });
};

module.exports = { setPhoneSocket, sendToPhone };
