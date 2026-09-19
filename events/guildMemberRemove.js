const logger = require("../utils/logger");
const {
    writeLog
} = require("../utils/database");

module.exports = {
    name: "guildMemberRemove",

    async execute(member) {
        logger.info(
            `${member.user.tag} left ${member.guild.name}.`
        );

        try {
            await writeLog(
                member.guild.id,
                "MEMBER_LEAVE",
                {
                    userId: member.id,
                    username: member.user.tag
                }
            );
        } catch (error) {
            logger.error(
                "Failed to log member leave."
            );

            logger.error(error);
        }
    }
};
