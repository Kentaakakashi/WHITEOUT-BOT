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
    buildMemberStatusEmbed,
    showWarPlan,
    claimTarget,
    releaseTarget,
    showAttackResultModal,
    handleAttackResult
} = require("../systems/warSystem");

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {

    name:
        "interactionCreate",

    async execute(
        interaction
    ) {

        /*
        |--------------------------------------------------------------------------
        | MODALS
        |--------------------------------------------------------------------------
        */

        if (
            interaction.isModalSubmit()
        ) {

            try {

                const id =
                    interaction.customId;

                if (
                    id.startsWith(
                        "whiteout:war:result:"
                    )
                ) {

                    const mapPosition =
                        Number(
                            id.split(":").pop()
                        );

                    return handleAttackResult(
                        interaction,
                        mapPosition
                    );
                }

            } catch (error) {

                logger.error(
                    "Modal interaction failed."
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

                    ephemeral:
                        true
                };

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    return interaction
                        .followUp(
                            reply
                        )
                        .catch(
                            () => {}
                        );

                }

                return interaction
                    .reply(
                        reply
                    )
                    .catch(
                        () => {}
                    );
            }

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | BUTTONS
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

                    return showClan(
                        interaction
                    );
                }

                if (
                    id ===
                    "whiteout:war"
                ) {

                    return showCurrentWar(
                        interaction
                    );
                }

                if (
                    id ===
                    "whiteout:members"
                ) {

                    return showMembers(
                        interaction
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | War Target Plan
                |--------------------------------------------------------------------------
                */

                if (
                    id.startsWith(
                        "whiteout:war:plan:"
                    )
                ) {

                    const page =
                        Number(
                            id.split(":").pop()
                        ) || 0;

                    return showWarPlan(
                        interaction,
                        page
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | Refresh Target Plan
                |--------------------------------------------------------------------------
                */

                if (
                    id ===
                    "whiteout:war:plan-refresh"
                ) {

                    await interaction.deferUpdate();

                    return showWarPlanAfterUpdate(
                        interaction
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | Claim Target
                |--------------------------------------------------------------------------
                */

                if (
                    id.startsWith(
                        "whiteout:war:claim:"
                    )
                ) {

                    const mapPosition =
                        Number(
                            id.split(":").pop()
                        );

                    return claimTarget(
                        interaction,
                        mapPosition
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | Release Target
                |--------------------------------------------------------------------------
                */

                if (
                    id.startsWith(
                        "whiteout:war:release:"
                    )
                ) {

                    const mapPosition =
                        Number(
                            id.split(":").pop()
                        );

                    return releaseTarget(
                        interaction,
                        mapPosition
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | Attack Result
                |--------------------------------------------------------------------------
                */

                if (
                    id.startsWith(
                        "whiteout:war:result:"
                    )
                ) {

                    const mapPosition =
                        Number(
                            id.split(":").pop()
                        );

                    return showAttackResultModal(
                        interaction,
                        mapPosition
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
                            force:
                                true
                        });

                    if (
                        !war ||
                        war.state ===
                        "notInWar"
                    ) {

                        return interaction
                            .editReply({

                                embeds: [
                                    errorEmbed(
                                        "Whiteout is not currently in a war."
                                    )
                                ],

                                components:
                                    []
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
                                        "whiteout:war:plan:0"
                                    )
                                    .setLabel(
                                        "Target Plan"
                                    )
                                    .setEmoji(
                                        "🎯"
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
                        .editReply({

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
                            force:
                                true
                        });

                    if (
                        !war ||
                        war.state ===
                        "notInWar"
                    ) {

                        return interaction
                            .editReply({

                                embeds: [
                                    errorEmbed(
                                        "Whiteout is not currently in a war."
                                    )
                                ],

                                components:
                                    []
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
                                ) /
                                15
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
                        .editReply({

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

                    ephemeral:
                        true
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
        | SLASH COMMANDS
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

                ephemeral:
                    true
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


/*
|--------------------------------------------------------------------------
| Target Plan Refresh Helper
|--------------------------------------------------------------------------
*/

async function showWarPlanAfterUpdate(
    interaction
) {

    try {

        const war =
            await getLiveWar({
                force:
                    true
            });

        if (
            !war ||
            war.state ===
            "notInWar"
        ) {

            return interaction
                .editReply({

                    embeds: [
                        errorEmbed(
                            "Whiteout is not currently in a war."
                        )
                    ],

                    components:
                        []
                });
        }

        const {
            getWarTargets
        } =
            require(
                "../utils/database"
            );

        const targets =
            await getWarTargets(
                war
            );

        const opponents =
            war.opponent?.members ||
            [];

        const pageSize =
            10;

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    opponents.length /
                    pageSize
                )
            );

        const page =
            0;

        const visible =
            opponents.slice(
                0,
                pageSize
            );

        const {
            buildWarPlanEmbed
        } =
            require(
                "../systems/warSystem"
            );

        const embed =
            buildWarPlanEmbed(
                war,
                targets,
                page
            );

        const rows =
            buildPlanButtonsLocal(
                page,
                totalPages,
                targets,
                visible
            );

        return interaction
            .editReply({

                embeds: [
                    embed
                ],

                components:
                    rows
            });

    } catch (error) {

        return interaction
            .editReply({

                embeds: [
                    errorEmbed(
                        error.message
                    )
                ],

                components:
                    []
            });
    }
}


function buildPlanButtonsLocal(
    page,
    totalPages,
    targets,
    visibleTargets
) {

    const rows = [];

    for (
        let i = 0;
        i < visibleTargets.length;
        i += 5
    ) {

        const row =
            new ActionRowBuilder();

        const chunk =
            visibleTargets.slice(
                i,
                i + 5
            );

        for (
            const member of chunk
        ) {

            const target =
                targets.find(
                    item =>
                        Number(
                            item.mapPosition
                        ) ===
                        Number(
                            member.mapPosition
                        )
                );

            if (
                target?.status ===
                "completed"
            ) {
                continue;
            }

            if (
                target?.status ===
                "claimed"
            ) {

                row.addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `whiteout:war:release:${member.mapPosition}`
                        )
                        .setLabel(
                            `Release #${member.mapPosition}`
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

            } else {

                row.addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `whiteout:war:claim:${member.mapPosition}`
                        )
                        .setLabel(
                            `Claim #${member.mapPosition}`
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );
            }
        }

        if (
            row.components.length
        ) {
            rows.push(row);
        }

        if (
            rows.length >= 4
        ) {
            break;
        }
    }

    rows.push(

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `whiteout:war:plan:${Math.max(0, page - 1)}`
                    )
                    .setLabel(
                        "Previous"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
                    .setDisabled(
                        page <= 0
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "whiteout:war:plan-refresh"
                    )
                    .setLabel(
                        "Refresh"
                    )
                    .setEmoji(
                        "🔄"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `whiteout:war:plan:${page + 1}`
                    )
                    .setLabel(
                        "Next"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
                    .setDisabled(
                        page >=
                        totalPages - 1
                    )
            )
    );

    return rows;
}
