const {
    SlashCommandBuilder
} = require("discord.js");

const {
    createDashboard,
    refreshDashboard
} = require("../../systems/dashboardSystem");

const {
    successEmbed,
    errorEmbed
} = require("../../utils/embeds");

const {
    getDashboard
} = require("../../utils/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dashboard")
        .setDescription(
            "Manage the Whiteout clan dashboard."
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription(
                    "Create the Whiteout clan dashboard."
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("refresh")
                .setDescription(
                    "Refresh the existing Whiteout dashboard."
                )
        ),

    async execute(interaction) {
        const subcommand =
            interaction.options.getSubcommand();

        try {
            if (subcommand === "create") {
                const existing =
                    await getDashboard(
                        interaction.guild.id
                    );

                if (existing) {
                    return interaction.reply({
                        embeds: [
                            errorEmbed(
                                "A Whiteout dashboard is already configured for this server.\n\nUse `/dashboard refresh` to update it."
                            )
                        ],
                        ephemeral: true
                    });
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                await createDashboard(
                    interaction
                );

                return interaction.editReply({
                    embeds: [
                        successEmbed(
                            "❄️ Dashboard Created",
                            "The Whiteout clan dashboard has been created in this channel."
                        )
                    ]
                });
            }

            if (subcommand === "refresh") {
                await interaction.deferReply({
                    ephemeral: true
                });

                const refreshed =
                    await refreshDashboard(
                        interaction.client,
                        interaction.guild.id
                    );

                if (!refreshed) {
                    return interaction.editReply({
                        embeds: [
                            errorEmbed(
                                "No valid Whiteout dashboard could be found."
                            )
                        ]
                    });
                }

                return interaction.editReply({
                    embeds: [
                        successEmbed(
                            "❄️ Dashboard Refreshed",
                            "The Whiteout dashboard has been updated with the latest clan data."
                        )
                    ]
                });
            }
        } catch (error) {
            console.error(error);

            if (
                interaction.deferred ||
                interaction.replied
            ) {
                return interaction.editReply({
                    embeds: [
                        errorEmbed(
                            `Dashboard operation failed.\n\n**Reason:** ${error.message}`
                        )
                    ]
                });
            }

            return interaction.reply({
                embeds: [
                    errorEmbed(
                        `Dashboard operation failed.\n\n**Reason:** ${error.message}`
                    )
                ],
                ephemeral: true
            });
        }
    }
};
