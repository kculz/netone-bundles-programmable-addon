const Queue = require('bull');
const { redis } = require('../config/redis.config');

const taskQueue = new Queue('bundle-tasks', {
    redis: redis
});

module.exports = taskQueue;
