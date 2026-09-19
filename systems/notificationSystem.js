const logger = require("../utils/logger");

async function initializeNotificationSystem(client) {
    logger.info("Notification system initialized.");
}

module.exports = {
    initializeNotificationSystem
};
