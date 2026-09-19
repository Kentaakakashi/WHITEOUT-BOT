const logger = require("../utils/logger");

const {
    errorEmbed
} = require("../utils/embeds");

const {
    showClan,
    showWar,
    showMembers
} = require("../systems/dashboardSystem");

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        /*
        |--------------------------------------------------------------------------
        | Dashboard Buttons
        |--------------------------------------------------------------------------
        */

        if (interaction.isButton()) {
            try {
                switch (interaction.customId) {
                    case "whiteout:clan":
                        return await showClan(
                            interaction
                        );

                    case "whiteout:war":
                        return await showWar(
                            interaction
                        );

                    case "whiteout:members":
                        return await showMembers(
                            interaction
                        );

                    default:
                        return;
                }
            } catch (error) {
                logger.error(
                    `Dashboard button failed: ${interaction.customId}`
                );

                logger.error(error);

                const reply = {
                    embeds: [
                        errorEmbed(
                            `Something went wrong.\n\n**Reason:** ${error.message}`
                        )
                    ],
                    ephemeral: true
                };

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {
                    await interaction.followUp(
                        reply
                    ).catch(() => {});
                } else {
                    await interaction.reply(
                        reply
                    ).catch(() => {});
                }
            }

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Slash Commands
        |--------------------------------------------------------------------------
        */

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command =
            interaction.client.commands.get(
                interaction.commandName
            );

        if (!command) {
            return;
        }

        try {
            await command.execute(
                interaction
            );
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

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction.followUp(
                    reply
                ).catch(() => {});
            } else {
                await interaction.reply(
                    reply
                ).catch(() => {});
            }
        }
    }
};
