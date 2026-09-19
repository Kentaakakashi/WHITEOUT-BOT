const {
    SlashCommandBuilder
} = require("discord.js");

const {
    getClan
} = require("../../utils/cocApi");

const {
    saveClanSnapshot
} = require("../../utils/database");

const {
    clanEmbed,
    errorEmbed
} = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clan")
        .setDescription(
            "Whiteout clan information."
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("profile")
                .setDescription(
                    "View the Whiteout clan profile."
                )
        ),

    async execute(interaction) {
        if (
            interaction.options.getSubcommand() !==
            "profile"
        ) {
            return;
        }

        await interaction.deferReply();

        try {
            const clan =
                await getClan();

            await saveClanSnapshot(
                clan
            );

            await interaction.editReply({
                embeds: [
                    clanEmbed(clan)
                ]
            });
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    errorEmbed(
                        `Could not retrieve the clan profile.\n\n**Reason:** ${error.message}`
                    )
                ]
            });
        }
    }
};
