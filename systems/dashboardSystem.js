const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const {
    getClan,
    getCurrentWar
} = require("../utils/cocApi");

const {
    saveClanSnapshot,
    saveDashboard
} = require("../utils/database");

const {
    clanEmbed,
    errorEmbed
} = require("../utils/embeds");

async function buildDashboard() {
    const clan = await getClan();

    await saveClanSnapshot(clan);

    const embed = clanEmbed(clan)
        .setTitle("❄️ WHITEOUT")
        .setDescription(
            `**${clan.name}**\n\n` +
            "Welcome to the Whiteout Clan Management Dashboard.\n\n" +
            "Use the controls below to access clan information, war data and member information."
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("whiteout:clan")
            .setLabel("Clan Info")
            .setEmoji("🏰")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("whiteout:war")
            .setLabel("Current War")
            .setEmoji("⚔️")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("whiteout:members")
            .setLabel("Members")
            .setEmoji("👥")
            .setStyle(ButtonStyle.Secondary)
    );

    return {
        embeds: [embed],
        components: [row]
    };
}

async function createDashboard(interaction) {
    const dashboard = await buildDashboard();

    const message = await interaction.channel.send(
        dashboard
    );

    await saveDashboard(
        interaction.guild.id,
        {
            channelId: interaction.channel.id,
            messageId: message.id
        }
    );

    return message;
}

async function refreshDashboard(client, guildId) {
    const {
        getDashboard
    } = require("../utils/database");

    const dashboardData =
        await getDashboard(guildId);

    if (!dashboardData) {
        return false;
    }

    try {
        const guild =
            await client.guilds.fetch(guildId);

        const channel =
            await guild.channels.fetch(
                dashboardData.channelId
            );

        if (!channel || !channel.isTextBased()) {
            return false;
        }

        const message =
            await channel.messages.fetch(
                dashboardData.messageId
            );

        const dashboard =
            await buildDashboard();

        await message.edit(dashboard);

        return true;
    } catch {
        return false;
    }
}

async function showClan(interaction) {
    const clan = await getClan();

    await saveClanSnapshot(clan);

    await interaction.reply({
        embeds: [
            clanEmbed(clan)
        ],
        ephemeral: true
    });
}

async function showWar(interaction) {
    const war = await getCurrentWar();

    if (war.state === "notInWar") {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Whiteout is not currently in a war."
                )
            ],
            ephemeral: true
        });
    }

    const clan = war.clan;
    const opponent = war.opponent;

    const stateText = {
        preparation: "Preparation",
        inWar: "Battle Day",
        warEnded: "War Ended"
    };

    const embed = clanEmbed(clan)
        .setTitle("⚔️ WHITEOUT CURRENT WAR")
        .setDescription(
            `**${clan.name}** vs **${opponent.name}**`
        )
        .addFields(
            {
                name: "Whiteout Stars",
                value: `${clan.stars ?? 0}`,
                inline: true
            },
            {
                name: "Opponent Stars",
                value: `${opponent.stars ?? 0}`,
                inline: true
            },
            {
                name: "Whiteout Destruction",
                value: `${Number(
                    clan.destructionPercentage || 0
                ).toFixed(2)}%`,
                inline: true
            },
            {
                name: "Opponent Destruction",
                value: `${Number(
                    opponent.destructionPercentage || 0
                ).toFixed(2)}%`,
                inline: true
            },
            {
                name: "War State",
                value:
                    stateText[war.state] ||
                    war.state ||
                    "Unknown",
                inline: true
            },
            {
                name: "Team Size",
                value: `${war.teamSize ?? "Unknown"}`,
                inline: true
            }
        );

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

async function showMembers(interaction) {
    const clan = await getClan();

    await saveClanSnapshot(clan);

    const members = clan.memberList || [];

    const sorted = [...members].sort(
        (a, b) =>
            (b.trophies || 0) -
            (a.trophies || 0)
    );

    const display = sorted
        .slice(0, 25)
        .map(
            (member, index) =>
                `**${index + 1}.** ${member.name} ` +
                `• TH${member.townHallLevel} ` +
                `• 🏆 ${member.trophies}`
        )
        .join("\n");

    const embed = clanEmbed(clan)
        .setTitle("👥 WHITEOUT MEMBERS")
        .setDescription(
            display ||
            "No member data available."
        );

    if (members.length > 25) {
        embed.setFooter({
            text:
                `Showing 25 of ${members.length} members`
        });
    }

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

module.exports = {
    buildDashboard,
    createDashboard,
    refreshDashboard,
    showClan,
    showWar,
    showMembers
};
