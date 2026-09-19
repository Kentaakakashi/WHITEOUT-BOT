const {
    SlashCommandBuilder
} = require("discord.js");

const {
    getPlayer
} = require("../../utils/cocApi");

const {
    getPlayerLink,
    savePlayerSnapshot
} = require("../../utils/database");

const {
    playerEmbed,
    errorEmbed
} = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("player")
        .setDescription(
            "Whiteout player information."
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("profile")
                .setDescription(
                    "View a Clash of Clans player profile."
                )
                .addStringOption(option =>
                    option
                        .setName("tag")
                        .setDescription(
                            "Player tag. Leave empty to use your linked account."
                        )
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        let tag =
            interaction.options.getString(
                "tag"
            );

        try {
            if (!tag) {
                const link =
                    await getPlayerLink(
                        interaction.user.id
                    );

                if (!link?.playerTag) {
                    return interaction.reply({
                        embeds: [
                            errorEmbed(
                                "You don't have a linked Clash of Clans account.\n\nUse `/link player` first, or provide a player tag."
                            )
                        ],
                        ephemeral: true
                    });
                }

                tag = link.playerTag;
            }

            await interaction.deferReply();

            const player =
                await getPlayer(tag);

            await savePlayerSnapshot(
                player
            );

            await interaction.editReply({
                embeds: [
                    playerEmbed(player)
                ]
            });
        } catch (error) {
            if (
                interaction.deferred ||
                interaction.replied
            ) {
                return interaction.editReply({
                    embeds: [
                        errorEmbed(
                            `Could not retrieve that player.\n\n**Reason:** ${error.message}`
                        )
                    ]
                });
            }

            return interaction.reply({
                embeds: [
                    errorEmbed(
                        `Could not retrieve that player.\n\n**Reason:** ${error.message}`
                    )
                ],
                ephemeral: true
            });
        }
    }
};
