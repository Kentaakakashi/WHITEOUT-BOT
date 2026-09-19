const {
    EmbedBuilder
} = require("discord.js");

const WHITEOUT_COLOR = 0x8EDCFF;
const WHITEOUT_DARK = 0x0B1220;
const SUCCESS_COLOR = 0x6EE7B7;
const ERROR_COLOR = 0xFF4D4D;
const WARNING_COLOR = 0xFFD166;

function baseEmbed() {
    return new EmbedBuilder()
        .setColor(WHITEOUT_COLOR)
        .setTimestamp()
        .setFooter({
            text: "WHITEOUT • Clan Management System"
        });
}

function errorEmbed(message) {
    return baseEmbed()
        .setColor(ERROR_COLOR)
        .setTitle("❌ Whiteout Error")
        .setDescription(message);
}

function successEmbed(title, message) {
    return baseEmbed()
        .setColor(SUCCESS_COLOR)
        .setTitle(title)
        .setDescription(message);
}

function warningEmbed(title, message) {
    return baseEmbed()
        .setColor(WARNING_COLOR)
        .setTitle(title)
        .setDescription(message);
}

function clanEmbed(clan) {
    const embed = baseEmbed()
        .setTitle(`❄️ ${clan.name}`)
        .setDescription(
            clan.description ||
            "Whiteout clan information."
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
                name: "🏆 Clan Trophies",
                value: `${clan.clanPoints ?? 0}`,
                inline: true
            },
            {
                name: "⚔️ War League",
                value:
                    clan.warLeague?.name ||
                    "Unknown",
                inline: true
            },
            {
                name: "🏰 Capital",
                value:
                    clan.clanCapitalPoints
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

    return embed;
}

function playerEmbed(player) {
    const embed = baseEmbed()
        .setTitle(`👤 ${player.name}`)
        .setDescription(
            `Clash of Clans Player\n\`${player.tag}\``
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
                name: "🏅 Best Trophies",
                value: `${player.bestTrophies ?? 0}`,
                inline: true
            },
            {
                name: "💰 Donations",
                value: `${player.donations ?? 0}`,
                inline: true
            },
            {
                name: "📥 Received",
                value: `${player.donationsReceived ?? 0}`,
                inline: true
            }
        );

    if (player.league?.iconUrls?.medium) {
        embed.setThumbnail(
            player.league.iconUrls.medium
        );
    }

    return embed;
}

module.exports = {
    WHITEOUT_COLOR,
    WHITEOUT_DARK,
    SUCCESS_COLOR,
    ERROR_COLOR,
    WARNING_COLOR,
    baseEmbed,
    errorEmbed,
    successEmbed,
    warningEmbed,
    clanEmbed,
    playerEmbed
};
