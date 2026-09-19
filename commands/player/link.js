const {
    SlashCommandBuilder
} = require("discord.js");

const {
    getPlayer,
    getClan,
    normalizeTag
} = require("../../utils/cocApi");

const {
    setPlayerLink,
    savePlayerSnapshot,
    writeLog
} = require("../../utils/database");

const {
    playerEmbed,
    successEmbed,
    errorEmbed
} = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("link")
        .setDescription(
            "Link your Discord account to your Clash of Clans account."
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("player")
                .setDescription(
                    "Link your Clash of Clans player."
                )
                .addStringOption(option =>
                    option
                        .setName("tag")
                        .setDescription(
                            "Your Clash of Clans player tag."
                        )
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const rawTag =
            interaction.options.getString("tag");

        await interaction.deferReply({
            ephemeral: true
        });

        try {
            const tag =
                normalizeTag(rawTag);

            const player =
                await getPlayer(tag);

            const clan =
                await getClan();

            const clanMember =
                clan.memberList?.find(
                    member =>
                        member.tag.toUpperCase() ===
                        player.tag.toUpperCase()
                );

            if (!clanMember) {
                return interaction.editReply({
                    embeds: [
                        errorEmbed(
                            `**${player.name}** is not currently a member of **${clan.name}**.\n\nOnly current Whiteout clan members can link their accounts.`
                        )
                    ]
                });
            }

            await setPlayerLink(
                interaction.user.id,
                {
                    discordUserId:
                        interaction.user.id,

                    discordUsername:
                        interaction.user.tag,

                    playerTag:
                        player.tag,

                    playerName:
                        player.name,

                    clanTag:
                        clan.tag,

                    clanName:
                        clan.name,

                    townHallLevel:
                        player.townHallLevel,

                    linkedAt:
                        new Date().toISOString()
                }
            );

            await savePlayerSnapshot(
                player
            );

            await writeLog(
                interaction.guild.id,
                "PLAYER_LINKED",
                {
                    discordUserId:
                        interaction.user.id,

                    discordUsername:
                        interaction.user.tag,

                    playerTag:
                        player.tag,

                    playerName:
                        player.name
                }
            );

            return interaction.editReply({
                embeds: [
                    successEmbed(
                        "🔗 Player Linked",
                        `Your Discord account is now linked to **${player.name}**.\n\n` +
                        `**Player:** \`${player.tag}\`\n` +
                        `**Town Hall:** TH${player.townHallLevel}\n` +
                        `**Clan:** ${clan.name}`
                    ),
                    playerEmbed(player)
                ]
            });
        } catch (error) {
            console.error(error);

            return interaction.editReply({
                embeds: [
                    errorEmbed(
                        `Could not link your Clash of Clans account.\n\n**Reason:** ${error.message}`
                    )
                ]
            });
        }
    }
};
