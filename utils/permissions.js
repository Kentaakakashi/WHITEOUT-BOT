const {
    PermissionFlagsBits
} = require("discord.js");

function isAdministrator(member) {
    if (!member) {
        return false;
    }

    return member.permissions.has(
        PermissionFlagsBits.Administrator
    );
}

function requireAdministrator(interaction) {
    if (!interaction.member) {
        return false;
    }

    return isAdministrator(interaction.member);
}

module.exports = {
    isAdministrator,
    requireAdministrator
};
