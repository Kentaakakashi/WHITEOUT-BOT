const admin = require("firebase-admin");

const config =
    require("../config/config");

const logger =
    require("./logger");

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

        const privateKey =
            config.firebase.privateKey.replace(
                /\\n/g,
                "\n"
            );

        if (!admin.apps.length) {

            admin.initializeApp({
                credential:
                    admin.credential.cert({
                        projectId:
                            config.firebase.projectId,

                        clientEmail:
                            config.firebase.clientEmail,

                        privateKey
                    })
            });
        }

        db =
            admin.firestore();

        initialized =
            true;

        logger.info(
            "Firebase / Firestore initialized."
        );

        return db;

    } catch (error) {

        logger.error(
            "Firebase initialization failed."
        );

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

async function getGuildSettings(
    guildId
) {

    const snapshot =
        await getDatabase()
            .collection("guilds")
            .doc(guildId)
            .get();

    return snapshot.exists
        ? snapshot.data()
        : null;
}

async function setGuildSettings(
    guildId,
    data
) {

    await getDatabase()
        .collection("guilds")
        .doc(guildId)
        .set(
            {
                ...data,

                updatedAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
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

async function getPlayerLink(
    discordUserId
) {

    const snapshot =
        await getDatabase()
            .collection("playerLinks")
            .doc(discordUserId)
            .get();

    return snapshot.exists
        ? snapshot.data()
        : null;
}

async function setPlayerLink(
    discordUserId,
    data
) {

    await getDatabase()
        .collection("playerLinks")
        .doc(discordUserId)
        .set(
            {
                ...data,

                updatedAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            },
            {
                merge: true
            }
        );
}

async function removePlayerLink(
    discordUserId
) {

    await getDatabase()
        .collection("playerLinks")
        .doc(discordUserId)
        .delete();
}


/*
|--------------------------------------------------------------------------
| Player Data
|--------------------------------------------------------------------------
*/

async function savePlayerSnapshot(
    player
) {

    const tag =
        player.tag
            .replace("#", "")
            .toUpperCase();

    await getDatabase()
        .collection("players")
        .doc(tag)
        .set(
            {
                ...player,

                lastUpdated:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            },
            {
                merge: true
            }
        );
}

async function getPlayerSnapshot(
    playerTag
) {

    const tag =
        playerTag
            .replace("#", "")
            .toUpperCase();

    const snapshot =
        await getDatabase()
            .collection("players")
            .doc(tag)
            .get();

    return snapshot.exists
        ? snapshot.data()
        : null;
}


/*
|--------------------------------------------------------------------------
| Clan Data
|--------------------------------------------------------------------------
*/

async function saveClanSnapshot(
    clan
) {

    const tag =
        clan.tag
            .replace("#", "")
            .toUpperCase();

    await getDatabase()
        .collection("clans")
        .doc(tag)
        .set(
            {
                ...clan,

                lastUpdated:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            },
            {
                merge: true
            }
        );
}

async function getClanSnapshot(
    clanTag
) {

    const tag =
        clanTag
            .replace("#", "")
            .toUpperCase();

    const snapshot =
        await getDatabase()
            .collection("clans")
            .doc(tag)
            .get();

    return snapshot.exists
        ? snapshot.data()
        : null;
}


/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

async function saveDashboard(
    guildId,
    data
) {

    await getDatabase()
        .collection("guilds")
        .doc(guildId)
        .set(
            {
                dashboard: data,

                updatedAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            },
            {
                merge: true
            }
        );
}

async function getDashboard(
    guildId
) {

    const settings =
        await getGuildSettings(
            guildId
        );

    return (
        settings?.dashboard ||
        null
    );
}


/*
|--------------------------------------------------------------------------
| Logs
|--------------------------------------------------------------------------
*/

async function writeLog(
    guildId,
    type,
    data = {}
) {

    await getDatabase()
        .collection("guilds")
        .doc(guildId)
        .collection("logs")
        .add(
            {
                type,

                ...data,

                createdAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            }
        );
}


/*
|--------------------------------------------------------------------------
| War Data
|--------------------------------------------------------------------------
*/

function makeWarDocumentId(
    war
) {

    const start =
        String(
            war?.startTime ||
            "unknown-start"
        )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            );

    const end =
        String(
            war?.endTime ||
            "unknown-end"
        )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            );

    return (
        `${start}-${end}`
    ).slice(
        0,
        140
    );
}


/*
|--------------------------------------------------------------------------
| Live War Snapshots
|--------------------------------------------------------------------------
*/

async function saveWarSnapshot(
    war
) {

    const documentId =
        makeWarDocumentId(
            war
        );

    await getDatabase()
        .collection("warSnapshots")
        .doc(documentId)
        .set(
            {
                ...war,

                lastUpdated:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            },
            {
                merge: true
            }
        );

    return documentId;
}


/*
|--------------------------------------------------------------------------
| Permanent War History
|--------------------------------------------------------------------------
*/

async function saveWarHistory(
    war
) {

    const documentId =
        makeWarDocumentId(
            war
        );

    await getDatabase()
        .collection("warHistory")
        .doc(documentId)
        .set(
            {
                ...war,

                savedAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            },
            {
                merge: true
            }
        );

    return documentId;
}

async function getRecentWarHistory(
    limit = 10
) {

    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 10,
                1
            ),
            50
        );

    const snapshot =
        await getDatabase()
            .collection("warHistory")
            .orderBy(
                "endTime",
                "desc"
            )
            .limit(
                safeLimit
            )
            .get();

    return snapshot.docs.map(
        doc => ({
            id: doc.id,
            ...doc.data()
        })
    );
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

    writeLog,

    saveWarSnapshot,
    saveWarHistory,
    getRecentWarHistory
};
