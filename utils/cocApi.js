const config = require("../config/config");

async function cocRequest(endpoint) {
    if (!config.coc.apiToken) {
        throw new Error("COC_API_TOKEN is missing.");
    }

    const response = await fetch(
        `${config.coc.baseUrl}${endpoint}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${config.coc.apiToken}`,
                Accept: "application/json"
            }
        }
    );

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.reason ||
            data?.message ||
            `Clash of Clans API returned HTTP ${response.status}`;

        const error = new Error(message);
        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}

function normalizeTag(tag) {
    if (!tag) {
        throw new Error("A Clash of Clans player/clan tag is required.");
    }

    const normalized = tag.trim().toUpperCase();

    return normalized.startsWith("#")
        ? normalized
        : `#${normalized}`;
}

async function getClan(clanTag = config.coc.clanTag) {
    const tag = normalizeTag(clanTag);

    return cocRequest(
        `/clans/${encodeURIComponent(tag)}`
    );
}

async function getPlayer(playerTag) {
    const tag = normalizeTag(playerTag);

    return cocRequest(
        `/players/${encodeURIComponent(tag)}`
    );
}

async function getCurrentWar(clanTag = config.coc.clanTag) {
    const tag = normalizeTag(clanTag);

    return cocRequest(
        `/clans/${encodeURIComponent(tag)}/currentwar`
    );
}

async function getWarLog(clanTag = config.coc.clanTag) {
    const tag = normalizeTag(clanTag);

    return cocRequest(
        `/clans/${encodeURIComponent(tag)}/warlog`
    );
}

async function getCapitalRaidSeasons(clanTag = config.coc.clanTag) {
    const tag = normalizeTag(clanTag);

    return cocRequest(
        `/clans/${encodeURIComponent(tag)}/capitalraidseasons`
    );
}

async function getCwlGroup(clanTag = config.coc.clanTag) {
    const tag = normalizeTag(clanTag);

    return cocRequest(
        `/clans/${encodeURIComponent(tag)}/currentwar/leaguegroup`
    );
}

module.exports = {
    cocRequest,
    normalizeTag,
    getClan,
    getPlayer,
    getCurrentWar,
    getWarLog,
    getCapitalRaidSeasons,
    getCwlGroup
};
