const logger = require("../utils/logger");
const {
    errorEmbed
} = require("../utils/embeds");

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command = interaction.client.commands.get(
            interaction.commandName
        );

        if (!command) {
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.error(
                `Command /${interaction.commandName} failed.`
            );

            logger.error(error);

            const reply = {
                embeds: [
                    errorEmbed(
                        "Something went wrong while running this command."
                    )
                ],
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply).catch(() => {});
            } else {
                await interaction.reply(reply).catch(() => {});
            }
        }
    }
};
