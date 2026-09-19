const logger = require("../utils/logger");
const {
    writeLog
} = require("../utils/database");

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {
        logger.info(
            `${member.user.tag} joined ${member.guild.name}.`
        );

        try {
            await writeLog(
                member.guild.id,
                "MEMBER_JOIN",
                {
                    userId: member.id,
                    username: member.user.tag
                }
            );
        } catch (error) {
            logger.error(
                "Failed to log member join."
            );

            logger.error(error);
        }
    }
};
