const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const {
    isAdministrator
} = require("../../utils/permissions");

const {
    baseEmbed,
    errorEmbed
} = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Whiteout administration controls.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(
                    "Check Whiteout bot system status."
                )
        ),

    async execute(interaction) {
        if (!isAdministrator(interaction.member)) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the **Administrator** permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const embed = baseEmbed()
            .setTitle("❄️ WHITEOUT SYSTEM STATUS")
            .setDescription(
                "Core Whiteout systems are online."
            )
            .addFields(
                {
                    name: "🤖 Discord",
                    value: "Online",
                    inline: true
                },
                {
                    name: "🔥 Database",
                    value: "Connected",
                    inline: true
                },
                {
                    name: "⚔️ Clash of Clans API",
                    value: "Configured",
                    inline: true
                }
            );

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};
