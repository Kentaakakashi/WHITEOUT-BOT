const {
    SlashCommandBuilder
} = require("discord.js");

const {
    showCurrentWar,
    showMemberStatus,
    showWarHistory
} = require("../../systems/warSystem");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("war")
        .setDescription(
            "Whiteout war management and live war data."
        )

        .addSubcommand(
            subcommand =>
                subcommand
                    .setName("current")
                    .setDescription(
                        "Show the live Whiteout current war."
                    )
        )

        .addSubcommand(
            subcommand =>
                subcommand
                    .setName("members")
                    .setDescription(
                        "Show Whiteout member attack status for the current war."
                    )
        )

        .addSubcommand(
            subcommand =>
                subcommand
                    .setName("history")
                    .setDescription(
                        "Show stored recent Whiteout war history."
                    )
        ),

    async execute(interaction) {

        const subcommand =
            interaction.options.getSubcommand();

        if (
            subcommand ===
            "current"
        ) {
            return showCurrentWar(
                interaction
            );
        }

        if (
            subcommand ===
            "members"
        ) {
            return showMemberStatus(
                interaction,
                0
            );
        }

        if (
            subcommand ===
            "history"
        ) {
            return showWarHistory(
                interaction
            );
        }
    }
};
