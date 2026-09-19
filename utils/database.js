const admin = require("firebase-admin");

const config = require("../config/config");
const logger = require("./logger");

let db = null;
let initialized = false;

async function initializeDatabase() {
    if (initialized) {
        return db;
    }

    if (
        !config.firebase.projectId ||
        !config.firebase.clientEmail ||
        !config.firebase.privateKey
    ) {
        throw new Error(
            "Firebase configuration is incomplete. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
        );
    }

    try {
        const privateKey = config.firebase.privateKey.replace(
            /\\n/g,
            "\n"
        );

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: config.firebase.projectId,
                clientEmail: config.firebase.clientEmail,
                privateKey
            })
        });

        db = admin.firestore();
        initialized = true;

        logger.info("Firebase / Firestore initialized.");

        return db;
    } catch (error) {
        logger.error("Firebase initialization failed.");
        throw error;
    }
}

function getDatabase() {
    if (!db) {
        throw new Error(
            "Database has not been initialized yet."
        );
    }

    return db;
}

/*
|--------------------------------------------------------------------------
| Guild Settings
|--------------------------------------------------------------------------
*/

async function getGuildSettings(guildId) {
    const database = getDatabase();

    const snapshot = await database
        .collection("guilds")
        .doc(guildId)
        .get();

    if (!snapshot.exists) {
        return null;
    }

    return snapshot.data();
}

async function setGuildSettings(guildId, data) {
    const database = getDatabase();

    await database
        .collection("guilds")
        .doc(guildId)
        .set(
            {
                ...data,
                updatedAt:
                    admin.firestore.FieldValue.serverTimestamp()
            },
            {
                merge: true
            }
        );
}

/*
|--------------------------------------------------------------------------
| Player Links
|--------------------------------------------------------------------------
*/

async function getPlayerLink(discordUserId) {
    const database = getDatabase();

    const snapshot = await database
        .collection("playerLinks")
        .doc(discordUserId)
        .get();

    if (!snapshot.exists) {
        return null;
    }

    return snapshot.data();
}

async function setPlayerLink(discordUserId, data) {
    const database = getDatabase();

    await database
        .collection("playerLinks")
        .doc(discordUserId)
        .set(
            {
                ...data,
                updatedAt:
                    admin.firestore.FieldValue.serverTimestamp()
            },
            {
                merge: true
            }
        );
}

async function removePlayerLink(discordUserId) {
    const database = getDatabase();

    await database
        .collection("playerLinks")
        .doc(discordUserId)
        .delete();
}

/*
|--------------------------------------------------------------------------
| Player Data
|--------------------------------------------------------------------------
*/

async function savePlayerSnapshot(player) {
    const database = getDatabase();

    const tag = player.tag.replace("#", "");

    await database
        .collection("players")
        .doc(tag)
        .set(
            {
                ...player,
                lastUpdated:
                    admin.firestore.FieldValue.serverTimestamp()
            },
            {
                merge: true
            }
        );
}

async function getPlayerSnapshot(playerTag) {
    const database = getDatabase();

    const tag = playerTag.replace("#", "").toUpperCase();

    const snapshot = await database
        .collection("players")
        .doc(tag)
        .get();

    if (!snapshot.exists) {
        return null;
    }

    return snapshot.data();
}

/*
|--------------------------------------------------------------------------
| Clan Data
|--------------------------------------------------------------------------
*/

async function saveClanSnapshot(clan) {
    const database = getDatabase();

    const tag = clan.tag.replace("#", "");

    await database
        .collection("clans")
        .doc(tag)
        .set(
            {
                ...clan,
                lastUpdated:
                    admin.firestore.FieldValue.serverTimestamp()
            },
            {
                merge: true
            }
        );
}

async function getClanSnapshot(clanTag) {
    const database = getDatabase();

    const tag = clanTag.replace("#", "").toUpperCase();

    const snapshot = await database
        .collection("clans")
        .doc(tag)
        .get();

    if (!snapshot.exists) {
        return null;
    }

    return snapshot.data();
}

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

async function saveDashboard(guildId, data) {
    const database = getDatabase();

    await database
        .collection("guilds")
        .doc(guildId)
        .set(
            {
                dashboard: data,
                updatedAt:
                    admin.firestore.FieldValue.serverTimestamp()
            },
            {
                merge: true
            }
        );
}

async function getDashboard(guildId) {
    const settings = await getGuildSettings(guildId);

    return settings?.dashboard || null;
}

/*
|--------------------------------------------------------------------------
| Logs
|--------------------------------------------------------------------------
*/

async function writeLog(guildId, type, data = {}) {
    const database = getDatabase();

    await database
        .collection("guilds")
        .doc(guildId)
        .collection("logs")
        .add({
            type,
            ...data,
            createdAt:
                admin.firestore.FieldValue.serverTimestamp()
        });
}

module.exports = {
    admin,
    initializeDatabase,
    getDatabase,

    getGuildSettings,
    setGuildSettings,

    getPlayerLink,
    setPlayerLink,
    removePlayerLink,

    savePlayerSnapshot,
    getPlayerSnapshot,

    saveClanSnapshot,
    getClanSnapshot,

    saveDashboard,
    getDashboard,

    writeLog
};
