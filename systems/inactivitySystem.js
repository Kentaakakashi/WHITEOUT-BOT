const logger = require("../utils/logger");

async function initializeInactivitySystem(client) {
    logger.info("Inactivity system initialized.");
}

module.exports = {
    initializeInactivitySystem
};
