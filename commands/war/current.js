const {
    SlashCommandBuilder
} = require("discord.js");

const {
    showCurrentWar,
    showMemberStatus,
    showWarHistory,
    showWarPlan,
    assignTargetFromCommand,
    unassignTargetFromCommand
} = require("../../systems/warSystem");

const {
    requireAdministrator
} = require("../../utils/permissions");

module.exports = {

    data:
        new SlashCommandBuilder()
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
                            "Show Whiteout member attack status."
                        )
            )

            .addSubcommand(
                subcommand =>
                    subcommand
                        .setName("plan")
                        .setDescription(
                            "Open the current war target planning board."
                        )
            )

            .addSubcommand(
                subcommand =>
                    subcommand
                        .setName("history")
                        .setDescription(
                            "Show recent Whiteout war history."
                        )
            )

            .addSubcommand(
                subcommand =>
                    subcommand
                        .setName("assign")
                        .setDescription(
                            "Assign an enemy target to a Discord member."
                        )
                        .addIntegerOption(
                            option =>
                                option
                                    .setName("target")
                                    .setDescription(
                                        "Enemy map position."
                                    )
                                    .setRequired(true)
                                    .setMinValue(1)
                        )
                        .addUserOption(
                            option =>
                                option
                                    .setName("member")
                                    .setDescription(
                                        "Discord member receiving the target."
                                    )
                                    .setRequired(true)
                        )
            )

            .addSubcommand(
                subcommand =>
                    subcommand
                        .setName("unassign")
                        .setDescription(
                            "Release an assigned enemy target."
                        )
                        .addIntegerOption(
                            option =>
                                option
                                    .setName("target")
                                    .setDescription(
                                        "Enemy map position."
                                    )
                                    .setRequired(true)
                                    .setMinValue(1)
                        )
            ),

    async execute(
        interaction
    ) {

        const subcommand =
            interaction.options.getSubcommand();

        /*
        |--------------------------------------------------------------------------
        | Public war commands
        |--------------------------------------------------------------------------
        */

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
            "plan"
        ) {
            return showWarPlan(
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


        /*
        |--------------------------------------------------------------------------
        | Admin-only war management
        |--------------------------------------------------------------------------
        */

        if (
            !requireAdministrator(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need the **Administrator** permission to use this war management command.",
                ephemeral: true
            });
        }

        if (
            subcommand ===
            "assign"
        ) {

            const target =
                interaction.options.getInteger(
                    "target"
                );

            const member =
                interaction.options.getUser(
                    "member"
                );

            return assignTargetFromCommand(
                interaction,
                target,
                member
            );
        }

        if (
            subcommand ===
            "unassign"
        ) {

            const target =
                interaction.options.getInteger(
                    "target"
                );

            return unassignTargetFromCommand(
                interaction,
                target
            );
        }
    }
};
