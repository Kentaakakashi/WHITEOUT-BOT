const {
    EmbedBuilder
} = require("discord.js");

const WHITEOUT_COLOR = 0x8EDCFF;

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
        .setColor(0xFF4D4D)
        .setTitle("❌ Whiteout Error")
        .setDescription(message);
}

function successEmbed(title, message) {
    return baseEmbed()
        .setColor(0x6EE7B7)
        .setTitle(title)
        .setDescription(message);
}

module.exports = {
    WHITEOUT_COLOR,
    baseEmbed,
    errorEmbed,
    successEmbed
};
