const logger = require("../utils/logger");

module.exports = {
    name: "ready",
    once: true,

    async execute(client) {
        logger.info(
            `Logged in as ${client.user.tag}`
        );

        logger.info(
            `Connected to ${client.guilds.cache.size} Discord server(s).`
        );

        client.user.setPresence({
            activities: [
                {
                    name: "Whiteout Clan",
                    type: 3
                }
            ],
            status: "online"
        });
    }
};
