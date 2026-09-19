const logger = require("../utils/logger");

const {
    getCurrentWar,
    getWarLog
} = require("../utils/cocApi");

const {
    saveWarSnapshot,
    saveWarHistory,
    getRecentWarHistory
} = require("../utils/database");

const {
    baseEmbed,
    errorEmbed,
    WHITEOUT_COLOR,
    WARNING_COLOR
} = require("../utils/embeds");

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const REFRESH_INTERVAL = 60 * 1000;

let refreshTimer = null;
let lastWar = null;
let lastWarError = null;

const STATE_TEXT = {
    preparation: "Preparation Day",
    inWar: "Battle Day",
    warEnded: "War Ended",
    notInWar: "Not In War"
};

function cleanTag(tag) {
    return String(tag || "")
        .replace("#", "")
        .toUpperCase();
}

function formatTimeRemaining(isoString) {
    if (!isoString) {
        return "Unknown";
    }

    const end = new Date(isoString).getTime();

    if (!Number.isFinite(end)) {
        return "Unknown";
    }

    const difference = end - Date.now();

    if (difference <= 0) {
        return "Ending / ended";
    }

    const totalMinutes =
        Math.floor(difference / 60000);

    const days =
        Math.floor(totalMinutes / 1440);

    const hours =
        Math.floor(
            (totalMinutes % 1440) / 60
        );

    const minutes =
        totalMinutes % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
}

function countAttacks(members = []) {
    return members.reduce(
        (total, member) => {
            return (
                total +
                (
                    Array.isArray(member.attacks)
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
            war?.attacksPerMember || 1
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
        Array.isArray(team?.members)
            ? team.members
            : [];

    const attacksUsed =
        countAttacks(members);

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
                team?.stars || 0
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

function normalizeWar(war) {
    if (!war) {
        return {
            state: "notInWar",

            clan: null,

            opponent: null,

            teamSize: 0,

            attacksPerMember: 1,

            startTime: null,

            endTime: null,

            remainingTime: null,

            fetchedAt:
                new Date().toISOString()
        };
    }

    const clan =
        summarizeTeam(
            war,
            war.clan
        );

    const opponent =
        summarizeTeam(
            war,
            war.opponent
        );

    return {
        state:
            war.state ||
            "unknown",

        teamSize:
            Number(
                war.teamSize ||
                clan.memberCount ||
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

        clan,

        opponent,

        fetchedAt:
            new Date().toISOString()
    };
}

function buildCurrentWarEmbed(war) {
    if (
        !war ||
        war.state === "notInWar"
    ) {
        return errorEmbed(
            "Whiteout is not currently in a war."
        );
    }

    const clan =
        war.clan;

    const opponent =
        war.opponent;

    const state =
        STATE_TEXT[war.state] ||
        war.state;

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

    const embed =
        baseEmbed()
            .setColor(
                war.state === "inWar"
                    ? WHITEOUT_COLOR
                    : WARNING_COLOR
            )
            .setTitle(
                "⚔️ WHITEOUT CURRENT WAR"
            )
            .setDescription(
                `**${clan.name}** vs **${opponent.name}**\n\n` +
                `**Status:** ${state}\n` +
                `**Current standing:** ${result}`
            )
            .addFields(
                {
                    name: "❄️ Whiteout",
                    value:
                        `⭐ **${clan.stars}** stars\n` +
                        `💥 **${clan.destructionPercentage.toFixed(2)}%** destruction\n` +
                        `⚔️ **${clan.attacksUsed}/${clan.attackCapacity}** attacks used\n` +
                        `📌 **${clan.attacksRemaining}** attacks remaining`,
                    inline: true
                },

                {
                    name: "👹 Opponent",
                    value:
                        `⭐ **${opponent.stars}** stars\n` +
                        `💥 **${opponent.destructionPercentage.toFixed(2)}%** destruction\n` +
                        `⚔️ **${opponent.attacksUsed}/${opponent.attackCapacity}** attacks used\n` +
                        `📌 **${opponent.attacksRemaining}** attacks remaining`,
                    inline: true
                },

                {
                    name: "⏱️ Time Remaining",
                    value:
                        `\`${war.remainingTime}\``,
                    inline: true
                },

                {
                    name: "👥 Team Size",
                    value:
                        `${war.teamSize}v${war.teamSize}`,
                    inline: true
                },

                {
                    name: "🎯 Attacks / Member",
                    value:
                        `${war.attacksPerMember}`,
                    inline: true
                }
            );

    if (clan.tag) {
        embed.setFooter({
            text:
                `Whiteout ${clan.tag} • Live Clash of Clans war data`
        });
    }

    return embed;
}

function buildMemberStatusEmbed(
    war,
    page = 0
) {
    const members =
        [
            ...(war?.clan?.members || [])
        ].sort(
            (a, b) => {

                const aAttacks =
                    Array.isArray(a.attacks)
                        ? a.attacks.length
                        : 0;

                const bAttacks =
                    Array.isArray(b.attacks)
                        ? b.attacks.length
                        : 0;

                if (
                    aAttacks !==
                    bAttacks
                ) {
                    return (
                        aAttacks -
                        bAttacks
                    );
                }

                return (
                    (a.mapPosition || 999) -
                    (b.mapPosition || 999)
                );
            }
        );

    const pageSize = 15;

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

                const attackText =
                    used
                        ? `${used}/${capacity} • ${stars}⭐ • ${destruction.toFixed(0)}%`
                        : `0/${capacity} • No attack`;

                return (
                    `${status} **` +
                    `${member.mapPosition || (
                        safePage *
                        pageSize +
                        index +
                        1
                    )}. ${member.name}**` +
                    ` — TH${member.townHallLevel || "?"}` +
                    ` — ${attackText}`
                );
            }
        );

    return baseEmbed()
        .setTitle(
            "⚔️ WHITEOUT WAR MEMBER STATUS"
        )
        .setDescription(
            lines.join("\n") ||
            "No Whiteout war members are available."
        )
        .setFooter({
            text:
                `Page ${safePage + 1}/${totalPages} • ⚠️ = attack remaining`
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
                    `whiteout:war:members:${Math.max(
                        0,
                        page - 1
                    )}`
                )
                .setLabel("Previous")
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
                .setLabel("Refresh War")
                .setEmoji("🔄")
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    `whiteout:war:members:${page + 1}`
                )
                .setLabel("Next")
                .setStyle(
                    ButtonStyle.Secondary
                )
                .setDisabled(
                    page >=
                    totalPages - 1
                )
        );
}

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

    /*
    |--------------------------------------------------------------------------
    | Save latest completed war into permanent history
    |--------------------------------------------------------------------------
    */

    if (
        normalized.state ===
        "warEnded"
    ) {
        try {
            const history =
                await getWarLog();

            const latestWar =
                Array.isArray(
                    history?.items
                )
                    ? history.items[0]
                    : null;

            if (latestWar) {
                await saveWarHistory(
                    latestWar
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

        if (age < 15000) {
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
            ephemeral: true
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
                        .setEmoji("👥")
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
                        .setEmoji("🔄")
                        .setStyle(
                            ButtonStyle.Primary
                        )
                )
        ],
        ephemeral: true
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
            ephemeral: true
        });
    }

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                (
                    war.clan?.members
                        ?.length || 0
                ) / 15
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
        ephemeral: true
    });
}

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
            ephemeral: true
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
                        clan.stars || 0
                    );

                const opponentStars =
                    Number(
                        opponent.stars || 0
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
                    `**${index + 1}.** ` +
                    `${result} — ` +
                    `**${clan.name || "Whiteout"}** ` +
                    `vs ` +
                    `**${opponent.name || "Opponent"}** ` +
                    `— ${clanStars}-${opponentStars} ` +
                    `— ${endTime}`
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
        ephemeral: true
    });
}

async function initializeWarSystem() {

    if (refreshTimer) {
        clearInterval(
            refreshTimer
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Automatic live war refresh
    |--------------------------------------------------------------------------
    */

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
    ){
        refreshTimer.unref();
    }

    /*
    |--------------------------------------------------------------------------
    | Initial API fetch
    |--------------------------------------------------------------------------
    */

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

module.exports = {
    initializeWarSystem,
    getLiveWar,
    showCurrentWar,
    showMemberStatus,
    showWarHistory,
    buildCurrentWarEmbed,
    buildMemberStatusEmbed,
    formatTimeRemaining,
    getLastWarError
};
