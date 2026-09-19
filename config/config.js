const config = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID
    },

    coc: {
        apiToken: process.env.COC_API_TOKEN,
        clanTag: process.env.COC_CLAN_TAG,
        baseUrl: "https://api.clashofclans.com/v1"
    },

    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
    }
};

module.exports = config;
