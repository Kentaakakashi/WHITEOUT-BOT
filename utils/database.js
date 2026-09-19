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
| War Snapshot / History
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


/*
|--------------------------------------------------------------------------
| War Management
|--------------------------------------------------------------------------
*/

function makeManagementWarId(
    war
) {

    const start =
        String(
            war?.startTime ||
            "unknown"
        )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            );

    const end =
        String(
            war?.endTime ||
            "unknown"
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

function makeTargetId(
    warId,
    mapPosition
) {

    return (
        `${warId}-target-${Number(
            mapPosition
        )}`
    ).slice(
        0,
        150
    );
}

async function getWarTarget(
    war,
    mapPosition
) {

    const warId =
        makeManagementWarId(
            war
        );

    const targetId =
        makeTargetId(
            warId,
            mapPosition
        );

    const snapshot =
        await getDatabase()
            .collection("warTargets")
            .doc(targetId)
            .get();

    if (!snapshot.exists) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}

async function getWarTargets(
    war
) {

    const warId =
        makeManagementWarId(
            war
        );

    const snapshot =
        await getDatabase()
            .collection("warTargets")
            .where(
                "warId",
                "==",
                warId
            )
            .get();

    return snapshot.docs.map(
        doc => ({
            id: doc.id,
            ...doc.data()
        })
    );
}

async function claimWarTarget(
    war,
    mapPosition,
    user
) {

    const warId =
        makeManagementWarId(
            war
        );

    const targetId =
        makeTargetId(
            warId,
            mapPosition
        );

    const ref =
        getDatabase()
            .collection("warTargets")
            .doc(targetId);

    return getDatabase().runTransaction(
        async transaction => {

            const snapshot =
                await transaction.get(
                    ref
                );

            if (
                snapshot.exists
            ) {

                const existing =
                    snapshot.data();

                if (
                    existing.status ===
                    "claimed" &&
                    existing.claimedById !==
                    user.id
                ) {

                    throw new Error(
                        `Target #${mapPosition} is already claimed by ${existing.claimedByName}.`
                    );
                }

                if (
                    existing.status ===
                    "completed"
                ) {

                    throw new Error(
                        `Target #${mapPosition} has already been completed.`
                    );
                }
            }

            const data = {
                warId,

                mapPosition:
                    Number(
                        mapPosition
                    ),

                status:
                    "claimed",

                claimedById:
                    user.id,

                claimedByName:
                    user.globalName ||
                    user.username,

                claimedAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp(),

                updatedAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            };

            transaction.set(
                ref,
                data,
                {
                    merge: true
                }
            );

            return {
                id: targetId,
                ...data
            };
        }
    );
}

async function releaseWarTarget(
    war,
    mapPosition,
    userId,
    force = false
) {

    const target =
        await getWarTarget(
            war,
            mapPosition
        );

    if (!target) {
        return false;
    }

    if (
        !force &&
        target.claimedById !==
        userId
    ) {
        throw new Error(
            "You can only release a target you claimed."
        );
    }

    if (
        target.status ===
        "completed"
    ) {
        throw new Error(
            "A completed target cannot be released."
        );
    }

    const warId =
        makeManagementWarId(
            war
        );

    const targetId =
        makeTargetId(
            warId,
            mapPosition
        );

    await getDatabase()
        .collection("warTargets")
        .doc(targetId)
        .set(
            {
                status:
                    "available",

                claimedById:
                    null,

                claimedByName:
                    null,

                claimedAt:
                    null,

                updatedAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp()
            },
            {
                merge: true
            }
        );

    return true;
}

async function saveWarAttackResult(
    war,
    mapPosition,
    result
) {

    const warId =
        makeManagementWarId(
            war
        );

    const targetId =
        makeTargetId(
            warId,
            mapPosition
        );

    const targetRef =
        getDatabase()
            .collection("warTargets")
            .doc(targetId);

    const attackRef =
        getDatabase()
            .collection("warAttacks")
            .doc();

    const targetSnapshot =
        await targetRef.get();

    if (!targetSnapshot.exists) {
        throw new Error(
            "This target has not been claimed."
        );
    }

    const target =
        targetSnapshot.data();

    if (
        target.status !==
        "claimed"
    ) {
        throw new Error(
            "This target is not currently claimed."
        );
    }

    if (
        target.claimedById !==
        result.discordUserId
    ) {
        throw new Error(
            "Only the member who claimed this target can record its result."
        );
    }

    const attackData = {

        warId,

        targetId,

        mapPosition:
            Number(
                mapPosition
            ),

        discordUserId:
            result.discordUserId,

        discordUserName:
            result.discordUserName,

        stars:
            Number(
                result.stars
            ),

        destructionPercentage:
            Number(
                result.destructionPercentage
            ),

        recordedAt:
            admin.firestore
                .FieldValue
                .serverTimestamp()
    };

    await attackRef.set(
        attackData
    );

    await targetRef.set(
        {
            status:
                "completed",

            resultStars:
                Number(
                    result.stars
                ),

            resultDestruction:
                Number(
                    result.destructionPercentage
                ),

            resultAttackId:
                attackRef.id,

            completedById:
                result.discordUserId,

            completedByName:
                result.discordUserName,

            completedAt:
                admin.firestore
                    .FieldValue
                    .serverTimestamp(),

            updatedAt:
                admin.firestore
                    .FieldValue
                    .serverTimestamp()
        },
        {
            merge: true
        }
    );

    return {
        id:
            attackRef.id,

        ...attackData
    };
}

async function getWarAttackHistory(
    war
) {

    const warId =
        makeManagementWarId(
            war
        );

    const snapshot =
        await getDatabase()
            .collection("warAttacks")
            .where(
                "warId",
                "==",
                warId
            )
            .get();

    return snapshot.docs.map(
        doc => ({
            id: doc.id,
            ...doc.data()
        })
    );
}


/*
|--------------------------------------------------------------------------
| Admin Assignment
|--------------------------------------------------------------------------
*/

async function assignWarTarget(
    war,
    mapPosition,
    discordUserId,
    discordUserName
) {

    const warId =
        makeManagementWarId(
            war
        );

    const targetId =
        makeTargetId(
            warId,
            mapPosition
        );

    const ref =
        getDatabase()
            .collection("warTargets")
            .doc(targetId);

    const existing =
        await ref.get();

    if (
        existing.exists &&
        existing.data().status ===
        "completed"
    ) {
        throw new Error(
            "That target has already been completed."
        );
    }

    await ref.set(
        {
            warId,

            mapPosition:
                Number(
                    mapPosition
                ),

            status:
                "claimed",

            claimedById:
                discordUserId,

            claimedByName:
                discordUserName,

            assignedByAdmin:
                true,

            assignedAt:
                admin.firestore
                    .FieldValue
                    .serverTimestamp(),

            updatedAt:
                admin.firestore
                    .FieldValue
                    .serverTimestamp()
        },
        {
            merge: true
        }
    );

    return true;
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
    getRecentWarHistory,

    getWarTarget,
    getWarTargets,
    claimWarTarget,
    releaseWarTarget,
    saveWarAttackResult,
    getWarAttackHistory,
    assignWarTarget
};
