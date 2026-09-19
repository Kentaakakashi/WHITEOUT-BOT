const logger =
    require("../utils/logger");

const {
    getCurrentWar,
    getWarLog
} = require("../utils/cocApi");

const {
    saveWarSnapshot,
    saveWarHistory,
    getRecentWarHistory,

    getWarTargets,
    getWarTarget,
    claimWarTarget,
    releaseWarTarget,
    saveWarAttackResult,
    getWarAttackHistory,
    assignWarTarget
} = require("../utils/database");

const {
    baseEmbed,
    errorEmbed,
    successEmbed,
    warningEmbed,
    WHITEOUT_COLOR,
    WARNING_COLOR
} = require("../utils/embeds");

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const REFRESH_INTERVAL =
    60 * 1000;

let refreshTimer = null;

let lastWar = null;

let lastWarError = null;


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function formatTimeRemaining(
    isoString
) {

    if (!isoString) {
        return "Unknown";
    }

    const end =
        new Date(
            isoString
        ).getTime();

    if (!Number.isFinite(end)) {
        return "Unknown";
    }

    const difference =
        end -
        Date.now();

    if (
        difference <= 0
    ) {
        return "Ending / ended";
    }

    const totalMinutes =
        Math.floor(
            difference /
            60000
        );

    const days =
        Math.floor(
            totalMinutes /
            1440
        );

    const hours =
        Math.floor(
            (totalMinutes %
                1440) /
            60
        );

    const minutes =
        totalMinutes %
        60;

    if (days > 0) {
        return (
            `${days}d ${hours}h ${minutes}m`
        );
    }

    if (hours > 0) {
        return (
            `${hours}h ${minutes}m`
        );
    }

    return `${minutes}m`;
}

function countAttacks(
    members = []
) {

    return members.reduce(
        (
            total,
            member
        ) => {

            return (
                total +
                (
                    Array.isArray(
                        member.attacks
                    )
                        ? member.attacks.length
                        : 0
                )
            );
        },
        0
    );
}

function getAttackCapacity(
    war,
    members = []
) {

    const attacksPerMember =
        Number(
            war?.attacksPerMember ||
            1
        );

    return (
        members.length *
        attacksPerMember
    );
}

function summarizeTeam(
    war,
    team
) {

    const members =
        Array.isArray(
            team?.members
        )
            ? team.members
            : [];

    const attacksUsed =
        countAttacks(
            members
        );

    const attackCapacity =
        getAttackCapacity(
            war,
            members
        );

    return {

        name:
            team?.name ||
            "Unknown",

        tag:
            team?.tag ||
            null,

        stars:
            Number(
                team?.stars ||
                0
            ),

        destructionPercentage:
            Number(
                team?.destructionPercentage ||
                0
            ),

        members,

        memberCount:
            members.length,

        attacksUsed,

        attackCapacity,

        attacksRemaining:
            Math.max(
                0,
                attackCapacity -
                attacksUsed
            )
    };
}

function normalizeWar(
    war
) {

    if (!war) {

        return {

            state:
                "notInWar",

            clan:
                null,

            opponent:
                null,

            teamSize:
                0,

            attacksPerMember:
                1,

            startTime:
                null,

            endTime:
                null,

            remainingTime:
                null,

            fetchedAt:
                new Date()
                    .toISOString()
        };
    }

    return {

        state:
            war.state ||
            "unknown",

        teamSize:
            Number(
                war.teamSize ||
                war.clan?.members?.length ||
                0
            ),

        attacksPerMember:
            Number(
                war.attacksPerMember ||
                1
            ),

        startTime:
            war.startTime ||
            null,

        endTime:
            war.endTime ||
            null,

        remainingTime:
            formatTimeRemaining(
                war.endTime
            ),

        clan:
            summarizeTeam(
                war,
                war.clan
            ),

        opponent:
            summarizeTeam(
                war,
                war.opponent
            ),

        fetchedAt:
            new Date()
                .toISOString()
    };
}


/*
|--------------------------------------------------------------------------
| Live War
|--------------------------------------------------------------------------
*/

async function fetchAndStoreCurrentWar() {

    const rawWar =
        await getCurrentWar();

    const normalized =
        normalizeWar(
            rawWar
        );

    lastWar =
        normalized;

    lastWarError =
        null;

    await saveWarSnapshot(
        normalized
    );

    if (
        normalized.state ===
        "warEnded"
    ) {

        try {

            const history =
                await getWarLog();

            const latest =
                Array.isArray(
                    history?.items
                )
                    ? history.items[0]
                    : null;

            if (latest) {

                await saveWarHistory(
                    latest
                );
            }

        } catch (error) {

            logger.warn(
                `War history refresh failed: ${error.message}`
            );
        }
    }

    return normalized;
}

async function getLiveWar({
    force = false
} = {}) {

    if (
        !force &&
        lastWar &&
        lastWar.fetchedAt
    ) {

        const age =
            Date.now() -
            new Date(
                lastWar.fetchedAt
            ).getTime();

        if (
            age <
            15000
        ) {
            return lastWar;
        }
    }

    try {

        return await fetchAndStoreCurrentWar();

    } catch (error) {

        lastWarError =
            error;

        logger.error(
            `Current war fetch failed: ${error.message}`
        );

        if (lastWar) {
            return lastWar;
        }

        throw error;
    }
}


/*
|--------------------------------------------------------------------------
| Current War Embed
|--------------------------------------------------------------------------
*/

function buildCurrentWarEmbed(
    war
) {

    if (
        !war ||
        war.state ===
        "notInWar"
    ) {

        return errorEmbed(
            "Whiteout is not currently in a war."
        );
    }

    const clan =
        war.clan;

    const opponent =
        war.opponent;

    let result =
        "Tied";

    if (
        clan.stars >
        opponent.stars
    ) {

        result =
            "Whiteout ahead";

    } else if (
        clan.stars <
        opponent.stars
    ) {

        result =
            "Opponent ahead";

    } else if (
        clan.destructionPercentage >
        opponent.destructionPercentage
    ) {

        result =
            "Whiteout ahead on destruction";

    } else if (
        clan.destructionPercentage <
        opponent.destructionPercentage
    ) {

        result =
            "Opponent ahead on destruction";
    }

    const stateText = {

        preparation:
            "Preparation Day",

        inWar:
            "Battle Day",

        warEnded:
            "War Ended"
    };

    return baseEmbed()

        .setColor(
            war.state ===
            "inWar"
                ? WHITEOUT_COLOR
                : WARNING_COLOR
        )

        .setTitle(
            "⚔️ WHITEOUT CURRENT WAR"
        )

        .setDescription(
            `**${clan.name}** vs **${opponent.name}**\n\n` +
            `**Status:** ${stateText[war.state] || war.state}\n` +
            `**Standing:** ${result}`
        )

        .addFields(

            {
                name:
                    "❄️ Whiteout",

                value:
                    `⭐ **${clan.stars}** stars\n` +
                    `💥 **${clan.destructionPercentage.toFixed(2)}%** destruction\n` +
                    `⚔️ **${clan.attacksUsed}/${clan.attackCapacity}** attacks used\n` +
                    `📌 **${clan.attacksRemaining}** remaining`,

                inline:
                    true
            },

            {
                name:
                    "👹 Opponent",

                value:
                    `⭐ **${opponent.stars}** stars\n` +
                    `💥 **${opponent.destructionPercentage.toFixed(2)}%** destruction\n` +
                    `⚔️ **${opponent.attacksUsed}/${opponent.attackCapacity}** attacks used\n` +
                    `📌 **${opponent.attacksRemaining}** remaining`,

                inline:
                    true
            },

            {
                name:
                    "⏱️ Time Remaining",

                value:
                    `\`${war.remainingTime}\``,

                inline:
                    true
            },

            {
                name:
                    "👥 Team",

                value:
                    `${war.teamSize}v${war.teamSize}`,

                inline:
                    true
            },

            {
                name:
                    "🎯 Attacks / Member",

                value:
                    `${war.attacksPerMember}`,

                inline:
                    true
            }
        );
}


/*
|--------------------------------------------------------------------------
| Current War Command
|--------------------------------------------------------------------------
*/

async function showCurrentWar(
    interaction
) {

    const war =
        await getLiveWar({
            force: true
        });

    if (
        war.state ===
        "notInWar"
    ) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Whiteout is not currently in a war."
                )
            ],

            ephemeral:
                true
        });
    }

    return interaction.reply({

        embeds: [
            buildCurrentWarEmbed(
                war
            )
        ],

        components: [

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
                )
        ],

        ephemeral:
            true
    });
}


/*
|--------------------------------------------------------------------------
| Member Status
|--------------------------------------------------------------------------
*/

function buildMemberStatusEmbed(
    war,
    page = 0
) {

    const members =
        [
            ...(war?.clan?.members || [])
        ].sort(
            (
                a,
                b
            ) => {

                const aa =
                    Array.isArray(
                        a.attacks
                    )
                        ? a.attacks.length
                        : 0;

                const ba =
                    Array.isArray(
                        b.attacks
                    )
                        ? b.attacks.length
                        : 0;

                if (
                    aa !== ba
                ) {
                    return aa - ba;
                }

                return (
                    (a.mapPosition || 999) -
                    (b.mapPosition || 999)
                );
            }
        );

    const pageSize =
        15;

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                members.length /
                pageSize
            )
        );

    const safePage =
        Math.min(
            Math.max(
                Number(page) || 0,
                0
            ),
            totalPages - 1
        );

    const slice =
        members.slice(
            safePage * pageSize,
            (safePage + 1) *
                pageSize
        );

    const lines =
        slice.map(
            (
                member,
                index
            ) => {

                const attacks =
                    Array.isArray(
                        member.attacks
                    )
                        ? member.attacks
                        : [];

                const used =
                    attacks.length;

                const stars =
                    attacks.reduce(
                        (
                            total,
                            attack
                        ) =>
                            total +
                            Number(
                                attack.stars ||
                                0
                            ),
                        0
                    );

                const destruction =
                    attacks.reduce(
                        (
                            total,
                            attack
                        ) =>
                            total +
                            Number(
                                attack.destructionPercentage ||
                                0
                            ),
                        0
                    );

                const capacity =
                    Number(
                        war.attacksPerMember ||
                        1
                    );

                const status =
                    used >= capacity
                        ? "✅"
                        : "⚠️";

                return (
                    `${status} **${member.mapPosition || (safePage * pageSize + index + 1)}. ${member.name}**` +
                    ` — TH${member.townHallLevel || "?"}` +
                    ` — ${used}/${capacity}` +
                    ` • ${stars}⭐` +
                    ` • ${destruction.toFixed(0)}%`
                );
            }
        );

    return baseEmbed()

        .setTitle(
            "⚔️ WHITEOUT WAR MEMBER STATUS"
        )

        .setDescription(
            lines.join("\n") ||
            "No Whiteout members are available."
        )

        .setFooter({
            text:
                `Page ${safePage + 1}/${totalPages} • ⚠️ = attack remaining`
        });
}

async function showMemberStatus(
    interaction,
    page = 0
) {

    const war =
        await getLiveWar({
            force: true
        });

    if (
        war.state ===
        "notInWar"
    ) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Whiteout is not currently in a war."
                )
            ],

            ephemeral:
                true
        });
    }

    const members =
        war.clan?.members ||
        [];

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                members.length /
                15
            )
        );

    const safePage =
        Math.min(
            Math.max(
                Number(page) || 0,
                0
            ),
            totalPages - 1
        );

    return interaction.reply({

        embeds: [
            buildMemberStatusEmbed(
                war,
                safePage
            )
        ],

        components: [
            buildMemberButtons(
                safePage,
                totalPages
            )
        ],

        ephemeral:
            true
    });
}

function buildMemberButtons(
    page,
    totalPages
) {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `whiteout:war:members:${Math.max(0, page - 1)}`
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
                    `whiteout:war:members:${page + 1}`
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
        );
}


/*
|--------------------------------------------------------------------------
| TARGET PLANNING
|--------------------------------------------------------------------------
*/

function getTargetMember(
    war,
    mapPosition
) {

    return (
        war?.opponent?.members ||
        []
    ).find(
        member =>
            Number(
                member.mapPosition
            ) ===
            Number(
                mapPosition
            )
    );
}

function getTargetStatus(
    targets,
    mapPosition
) {

    return (
        targets.find(
            target =>
                Number(
                    target.mapPosition
                ) ===
                Number(
                    mapPosition
                )
        ) ||
        null
    );
}

function buildWarPlanEmbed(
    war,
    targets,
    page = 0
) {

    const opponents =
        [
            ...(war?.opponent?.members || [])
        ].sort(
            (
                a,
                b
            ) =>
                (
                    a.mapPosition ||
                    999
                ) -
                (
                    b.mapPosition ||
                    999
                )
        );

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

    const safePage =
        Math.min(
            Math.max(
                Number(page) || 0,
                0
            ),
            totalPages - 1
        );

    const visible =
        opponents.slice(
            safePage * pageSize,
            (safePage + 1) *
                pageSize
        );

    const lines =
        visible.map(
            member => {

                const target =
                    getTargetStatus(
                        targets,
                        member.mapPosition
                    );

                let status =
                    "🟢 Available";

                if (
                    target?.status ===
                    "claimed"
                ) {

                    status =
                        `🎯 **Claimed by ${target.claimedByName}**`;

                } else if (
                    target?.status ===
                    "completed"
                ) {

                    status =
                        `✅ **${target.resultStars}⭐ • ${target.resultDestruction}%**`;
                }

                return (
                    `**#${member.mapPosition}** ` +
                    `TH${member.townHallLevel || "?"} ` +
                    `**${member.name}**\n` +
                    `${status}`
                );
            }
        );

    return baseEmbed()

        .setColor(
            WHITEOUT_COLOR
        )

        .setTitle(
            "🎯 WHITEOUT WAR TARGET PLAN"
        )

        .setDescription(
            `**${war.clan.name}** vs **${war.opponent.name}**\n\n` +
            (lines.join("\n\n") ||
                "No enemy targets available.")
        )

        .setFooter({
            text:
                `Page ${safePage + 1}/${totalPages} • Claim a target before attacking`
        });
}

function buildPlanButtons(
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
                getTargetStatus(
                    targets,
                    member.mapPosition
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

    const navigation =
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
            );

    rows.push(
        navigation
    );

    return rows;
}

async function showWarPlan(
    interaction,
    page = 0
) {

    const war =
        await getLiveWar({
            force: true
        });

    if (
        war.state ===
        "notInWar"
    ) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Whiteout is not currently in a war."
                )
            ],

            ephemeral:
                true
        });
    }

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

    const safePage =
        Math.min(
            Math.max(
                Number(page) || 0,
                0
            ),
            totalPages - 1
        );

    const visible =
        opponents.slice(
            safePage * pageSize,
            (safePage + 1) *
                pageSize
        );

    return interaction.reply({

        embeds: [
            buildWarPlanEmbed(
                war,
                targets,
                safePage
            )
        ],

        components:
            buildPlanButtons(
                safePage,
                totalPages,
                targets,
                visible
            ),

        ephemeral:
            true
    });
}


/*
|--------------------------------------------------------------------------
| Claim Target
|--------------------------------------------------------------------------
*/
async function claimTarget(
    interaction,
    mapPosition
) {

    const war =
        await getLiveWar({
            force: true
        });

    if (
        war.state ===
        "notInWar"
    ) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "There is no active war."
                )
            ],

            ephemeral:
                true
        });
    }

    const target =
        getTargetMember(
            war,
            mapPosition
        );

    if (!target) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    `Enemy target #${mapPosition} does not exist.`
                )
            ],

            ephemeral:
                true
        });
    }

    try {

        await claimWarTarget(
            war,
            mapPosition,
            interaction.user
        );

        return interaction.reply({

            embeds: [
                successEmbed(
                    `🎯 Target **#${mapPosition} — ${target.name}** is now claimed by **${interaction.user.globalName || interaction.user.username}**.`
                )
            ],

            ephemeral:
                true
        });

    } catch (error) {

        return interaction.reply({

            embeds: [
                errorEmbed(
                    error.message
                )
            ],

            ephemeral:
                true
        });
    }
}


/*
|--------------------------------------------------------------------------
| Release Target
|--------------------------------------------------------------------------
*/

async function releaseTarget(
    interaction,
    mapPosition
) {

    const war =
        await getLiveWar({
            force: true
        });

    try {

        await releaseWarTarget(
            war,
            mapPosition,
            interaction.user.id,
            false
        );

        return interaction.reply({

            embeds: [
                successEmbed(
                    `🔓 Target **#${mapPosition}** has been released.`
                )
            ],

            ephemeral:
                true
        });

    } catch (error) {

        return interaction.reply({

            embeds: [
                errorEmbed(
                    error.message
                )
            ],

            ephemeral:
                true
        });
    }
}


/*
|--------------------------------------------------------------------------
| Attack Result Modal
|--------------------------------------------------------------------------
*/

async function showAttackResultModal(
    interaction,
    mapPosition
) {

    const war =
        await getLiveWar({
            force: true
        });

    const target =
        await getWarTarget(
            war,
            mapPosition
        );

    if (!target) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "That target has not been claimed."
                )
            ],

            ephemeral:
                true
        });
    }

    if (
        target.claimedById !==
        interaction.user.id
    ) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Only the member who claimed this target can record its result."
                )
            ],

            ephemeral:
                true
        });
    }

    if (
        target.status ===
        "completed"
    ) {

        return interaction.reply({
            embeds: [
                warningEmbed(
                    "This target already has a recorded result."
                )
            ],

            ephemeral:
                true
        });
    }

    const modal =
        new ModalBuilder()
            .setCustomId(
                `whiteout:war:result:${mapPosition}`
            )
            .setTitle(
                `Attack Result — Target #${mapPosition}`
            );

    const stars =
        new TextInputBuilder()
            .setCustomId(
                "stars"
            )
            .setLabel(
                "Stars earned (0-3)"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setPlaceholder(
                "Example: 3"
            )
            .setRequired(
                true
            )
            .setMaxLength(
                1
            );

    const destruction =
        new TextInputBuilder()
            .setCustomId(
                "destruction"
            )
            .setLabel(
                "Destruction percentage (0-100)"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setPlaceholder(
                "Example: 100"
            )
            .setRequired(
                true
            )
            .setMaxLength(
                3
            );

    modal.addComponents(

        new ActionRowBuilder()
            .addComponents(
                stars
            ),

        new ActionRowBuilder()
            .addComponents(
                destruction
            )
    );

    return interaction.showModal(
        modal
    );
}


/*
|--------------------------------------------------------------------------
| Save Attack Result
|--------------------------------------------------------------------------
*/

async function handleAttackResult(
    interaction,
    mapPosition
) {

    const stars =
        Number(
            interaction.fields.getTextInputValue(
                "stars"
            )
        );

    const destruction =
        Number(
            interaction.fields.getTextInputValue(
                "destruction"
            )
        );

    if (
        !Number.isInteger(
            stars
        ) ||
        stars < 0 ||
        stars > 3
    ) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Stars must be a whole number from 0 to 3."
                )
            ],

            ephemeral:
                true
        });
    }

    if (
        !Number.isFinite(
            destruction
        ) ||
        destruction < 0 ||
        destruction > 100
    ) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Destruction must be between 0 and 100."
                )
            ],

            ephemeral:
                true
        });
    }

    const war =
        await getLiveWar({
            force: true
        });

    try {

        const result =
            await saveWarAttackResult(
                war,
                mapPosition,
                {
                    discordUserId:
                        interaction.user.id,

                    discordUserName:
                        interaction.user.globalName ||
                        interaction.user.username,

                    stars,

                    destructionPercentage:
                        destruction
                }
            );

        return interaction.reply({

            embeds: [
                successEmbed(
                    `⚔️ Attack recorded against **target #${mapPosition}**.\n\n` +
                    `⭐ **${result.stars} stars**\n` +
                    `💥 **${result.destructionPercentage}% destruction**`
                )
            ],

            ephemeral:
                true
        });

    } catch (error) {

        return interaction.reply({

            embeds: [
                errorEmbed(
                    error.message
                )
            ],

            ephemeral:
                true
        });
    }
}


/*
|--------------------------------------------------------------------------
| Admin Assignment
|--------------------------------------------------------------------------
*/
async function assignTargetFromCommand(
    interaction,
    mapPosition,
    member
) {

    const war =
        await getLiveWar({
            force: true
        });

    if (
        war.state ===
        "notInWar"
    ) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "There is no active war."
                )
            ],

            ephemeral:
                true
        });
    }

    const target =
        getTargetMember(
            war,
            mapPosition
        );

    if (!target) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    `Enemy target #${mapPosition} does not exist.`
                )
            ],

            ephemeral:
                true
        });
    }

    try {

        await assignWarTarget(
            war,
            mapPosition,
            member.id,
            member.globalName ||
            member.username
        );

        return interaction.reply({

            embeds: [
                successEmbed(
                    `🎯 Assigned **#${mapPosition} — ${target.name}** to **${member.globalName || member.username}**.`
                )
            ],

            ephemeral:
                true
        });

    } catch (error) {

        return interaction.reply({

            embeds: [
                errorEmbed(
                    error.message
                )
            ],

            ephemeral:
                true
        });
    }
}

async function unassignTargetFromCommand(
    interaction,
    mapPosition
) {

    const war =
        await getLiveWar({
            force: true
        });

    try {

        await releaseWarTarget(
            war,
            mapPosition,
            interaction.user.id,
            true
        );

        return interaction.reply({

            embeds: [
                successEmbed(
                    `🔓 Target **#${mapPosition}** has been unassigned by an administrator.`
                )
            ],

            ephemeral:
                true
        });

    } catch (error) {

        return interaction.reply({

            embeds: [
                errorEmbed(
                    error.message
                )
            ],

            ephemeral:
                true
        });
    }
}


/*
|--------------------------------------------------------------------------
| History
|--------------------------------------------------------------------------
*/
async function showWarHistory(
    interaction
) {

    const history =
        await getRecentWarHistory(
            10
        );

    if (!history.length) {

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "No stored Whiteout war history is available yet."
                )
            ],

            ephemeral:
                true
        });
    }

    const lines =
        history.map(
            (
                war,
                index
            ) => {

                const clan =
                    war.clan || {};

                const opponent =
                    war.opponent || {};

                const clanStars =
                    Number(
                        clan.stars ||
                        0
                    );

                const opponentStars =
                    Number(
                        opponent.stars ||
                        0
                    );

                let result =
                    "Draw";

                if (
                    clanStars >
                    opponentStars
                ) {
                    result =
                        "Whiteout win";
                } else if (
                    clanStars <
                    opponentStars
                ) {
                    result =
                        "Loss";
                }

                const endTime =
                    war.endTime
                        ? new Date(
                            war.endTime
                        ).toLocaleString()
                        : "Unknown";

                return (
                    `**${index + 1}.** ${result} — ` +
                    `**${clan.name || "Whiteout"}** vs ` +
                    `**${opponent.name || "Opponent"}** — ` +
                    `${clanStars}-${opponentStars} — ` +
                    `${endTime}`
                );
            }
        );

    return interaction.reply({

        embeds: [
            baseEmbed()
                .setTitle(
                    "📜 WHITEOUT WAR HISTORY"
                )
                .setDescription(
                    lines.join("\n")
                )
        ],

        ephemeral:
            true
    });
}


/*
|--------------------------------------------------------------------------
| Automatic Refresh
|--------------------------------------------------------------------------
*/
async function initializeWarSystem() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );
    }

    refreshTimer =
        setInterval(
            async () => {

                try {

                    await fetchAndStoreCurrentWar();

                } catch (error) {

                    logger.warn(
                        `Automatic war refresh failed: ${error.message}`
                    );
                }

            },
            REFRESH_INTERVAL
        );

    if (
        typeof refreshTimer.unref ===
        "function"
    ) {

        refreshTimer.unref();
    }

    try {

        await fetchAndStoreCurrentWar();

        logger.info(
            "War system initialized with live Clash of Clans data."
        );

    } catch (error) {

        logger.warn(
            `War system started, but initial war fetch failed: ${error.message}`
        );
    }
}

function getLastWarError() {
    return lastWarError;
}


/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {

    initializeWarSystem,

    getLiveWar,

    showCurrentWar,

    showMemberStatus,

    showWarHistory,

    showWarPlan,

    claimTarget,

    releaseTarget,

    showAttackResultModal,

    handleAttackResult,

    assignTargetFromCommand,

    unassignTargetFromCommand,

    buildCurrentWarEmbed,

    buildMemberStatusEmbed,

    buildWarPlanEmbed,

    formatTimeRemaining,

    getLastWarError,

    getWarAttackHistory
};

            1,
            Math.ceil(
            
