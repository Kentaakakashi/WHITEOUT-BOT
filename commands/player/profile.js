const {
    SlashCommandBuilder
} = require("discord.js");

const {
    getPlayer
} = require("../../utils/cocApi");

const {
    baseEmbed,
    errorEmbed
} = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("player")
        .setDescription("Whiteout player information.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("profile")
                .setDescription("View a Clash of Clans player profile.")
                .addStringOption(option =>
                    option
                        .setName("tag")
                        .setDescription(
                            "Clash of Clans player tag, e.g. #ABC123"
                        )
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const tag =
            interaction.options.getString("tag");

        await interaction.deferReply();

        try {
            const player = await getPlayer(tag);

            const heroes = player.heroes || [];

            const heroText =
                heroes.length > 0
                    ? heroes
                        .map(
                            hero =>
                                `${hero.name}: ${hero.level}/${hero.maxLevel}`
                        )
                        .join("\n")
                    : "No hero data available.";

            const embed = baseEmbed()
                .setTitle(`${player.name}`)
                .setDescription(
                    `Clash of Clans player profile\n\`${player.tag}\``
                )
                .addFields(
                    {
                        name: "🏰 Town Hall",
                        value: `${player.townHallLevel ?? "Unknown"}`,
                        inline: true
                    },
                    {
                        name: "⭐ XP Level",
                        value: `${player.expLevel ?? "Unknown"}`,
                        inline: true
                    },
                    {
                        name: "🏆 Trophies",
                        value: `${player.trophies ?? 0}`,
                        inline: true
                    },
                    {
                        name: "⚔️ War Stars",
                        value: `${player.achievements?.find(
                            achievement =>
                                achievement.name ===
                                "War League Legend"
                        )?.value ?? "—"}`,
                        inline: true
                    },
                    {
                        name: "💰 Donations",
                        value: `${player.donations ?? 0}`,
                        inline: true
                    },
                    {
                        name: "🏅 League",
                        value: player.league?.name || "Unranked",
                        inline: true
                    },
                    {
                        name: "🦸 Heroes",
                        value: heroText,
                        inline: false
                    }
                );

            if (player.league?.iconUrls?.medium) {
                embed.setThumbnail(
                    player.league.iconUrls.medium
                );
            }

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    errorEmbed(
                        `Could not retrieve that player.\n\n**Reason:** ${error.message}`
                    )
                ]
            });
        }
    }
};
