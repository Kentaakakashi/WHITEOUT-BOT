const {
    SlashCommandBuilder
} = require("discord.js");

const {
    getClan
} = require("../../utils/cocApi");

const {
    baseEmbed,
    errorEmbed
} = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clan")
        .setDescription("Whiteout clan information.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("profile")
                .setDescription("View the Whiteout clan profile.")
        ),

    async execute(interaction) {
        if (interaction.options.getSubcommand() !== "profile") {
            return;
        }

        await interaction.deferReply();

        try {
            const clan = await getClan();

            const embed = baseEmbed()
                .setTitle(`${clan.name}`)
                .setDescription(
                    clan.description ||
                    "No clan description has been set."
                )
                .addFields(
                    {
                        name: "🏷️ Clan Tag",
                        value: `\`${clan.tag}\``,
                        inline: true
                    },
                    {
                        name: "⭐ Clan Level",
                        value: `${clan.clanLevel ?? "Unknown"}`,
                        inline: true
                    },
                    {
                        name: "👥 Members",
                        value: `${clan.members ?? "Unknown"}/50`,
                        inline: true
                    },
                    {
                        name: "🏆 Trophies",
                        value: `${clan.clanPoints ?? 0}`,
                        inline: true
                    },
                    {
                        name: "⚔️ War League",
                        value: clan.warLeague?.name || "Unknown",
                        inline: true
                    },
                    {
                        name: "🏰 Capital",
                        value: clan.clanCapitalPoints
                            ? `${clan.clanCapitalPoints}`
                            : "Unknown",
                        inline: true
                    }
                );

            if (clan.badgeUrls?.large) {
                embed.setThumbnail(
                    clan.badgeUrls.large
                );
            }

            await interaction.editReply({
                embeds: [embed]
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
