const logger =
    require("../utils/logger");

const {
    errorEmbed
} = require("../utils/embeds");

const {
    showClan,
    showMembers
} = require("../systems/dashboardSystem");

const {
    showCurrentWar,
    getLiveWar,
    buildCurrentWarEmbed,
    buildMemberStatusEmbed
} = require("../systems/warSystem");

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    name: "interactionCreate",

    async execute(
        interaction
    ) {

        /*
        |--------------------------------------------------------------------------
        | Buttons
        |--------------------------------------------------------------------------
        */

        if (
            interaction.isButton()
        ) {

            try {

                const id =
                    interaction.customId;


                /*
                |--------------------------------------------------------------------------
                | Main Dashboard
                |--------------------------------------------------------------------------
                */

                if (
                    id ===
                    "whiteout:clan"
                ) {

                    return await showClan(
                        interaction
                    );
                }

                if (
                    id ===
                    "whiteout:war"
                ) {

                    return await showCurrentWar(
                        interaction
                    );
                }

                if (
                    id ===
                    "whiteout:members"
                ) {

                    return await showMembers(
                        interaction
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | War Refresh
                |--------------------------------------------------------------------------
                */

                if (
                    id ===
                    "whiteout:war:refresh"
                ) {

                    await interaction.deferUpdate();

                    const war =
                        await getLiveWar({
                            force: true
                        });

                    if (
                        !war ||
                        war.state ===
                        "notInWar"
                    ) {

                        return interaction
                            .message
                            .edit({
                                embeds: [
                                    errorEmbed(
                                        "Whiteout is not currently in a war."
                                    )
                                ],
                                components: []
                            });
                    }

                    const row =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        "whiteout:war:members:0"
                                    )
                                    .setLabel(
                                        "Member Status"
                                    )
                                    .setEmoji(
                                        "👥"
                                    )
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "whiteout:war:refresh"
                                    )
                                    .setLabel(
                                        "Refresh"
                                    )
                                    .setEmoji(
                                        "🔄"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    )
                            );

                    return interaction
                        .message
                        .edit({
                            embeds: [
                                buildCurrentWarEmbed(
                                    war
                                )
                            ],
                            components: [
                                row
                            ]
                        });
                }


                /*
                |--------------------------------------------------------------------------
                | War Member Pages
                |--------------------------------------------------------------------------
                */

                if (
                    id.startsWith(
                        "whiteout:war:members:"
                    )
                ) {

                    const page =
                        Number(
                            id.split(":").pop()
                        ) || 0;

                    await interaction
                        .deferUpdate();

                    const war =
                        await getLiveWar({
                            force: true
                        });

                    if (
                        !war ||
                        war.state ===
                        "notInWar"
                    ) {

                        return interaction
                            .message
                            .edit({
                                embeds: [
                                    errorEmbed(
                                        "Whiteout is not currently in a war."
                                    )
                                ],
                                components: []
                            });
                    }

                    const totalPages =
                        Math.max(
                            1,
                            Math.ceil(
                                (
                                    war.clan
                                        ?.members
                                        ?.length ||
                                    0
                                ) / 15
                            )
                        );

                    const safePage =
                        Math.min(
                            Math.max(
                                page,
                                0
                            ),
                            totalPages - 1
                        );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        `whiteout:war:members:${safePage - 1}`
                                    )
                                    .setLabel(
                                        "Previous"
                                    )
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    )
                                    .setDisabled(
                                        safePage <= 0
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "whiteout:war:refresh"
                                    )
                                    .setLabel(
                                        "Refresh War"
                                    )
                                    .setEmoji(
                                        "🔄"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        `whiteout:war:members:${safePage + 1}`
                                    )
                                    .setLabel(
                                        "Next"
                                    )
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    )
                                    .setDisabled(
                                        safePage >=
                                        totalPages - 1
                                    )
                            );

                    return interaction
                        .message
                        .edit({
                            embeds: [
                                buildMemberStatusEmbed(
                                    war,
                                    safePage
                                )
                            ],
                            components: [
                                row
                            ]
                        });
                }

                return;

            } catch (error) {

                logger.error(
                    `Button interaction failed: ${interaction.customId}`
                );

                logger.error(
                    error
                );

                const reply = {
                    embeds: [
                        errorEmbed(
                            `Something went wrong.\n\n**Reason:** ${error.message}`
                        )
                    ],
                    ephemeral: true
                };

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction
                        .followUp(
                            reply
                        )
                        .catch(
                            () => {}
                        );

                } else {

                    await interaction
                        .reply(
                            reply
                        )
                        .catch(
                            () => {}
                        );
                }
            }

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | Slash Commands
        |--------------------------------------------------------------------------
        */

        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        const command =
            interaction.client.commands.get(
                interaction.commandName
            );

        if (!command) {
            return;
        }

        try {

            await command.execute(
                interaction
            );

        } catch (error) {

            logger.error(
                `Command /${interaction.commandName} failed.`
            );

            logger.error(
                error
            );

            const reply = {
                embeds: [
                    errorEmbed(
                        `Something went wrong while running this command.\n\n**Reason:** ${error.message}`
                    )
                ],
                ephemeral: true
            };

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction
                    .followUp(
                        reply
                    )
                    .catch(
                        () => {}
                    );

            } else {

                await interaction
                    .reply(
                        reply
                    )
                    .catch(
                        () => {}
                    );
            }
        }
    }
};
