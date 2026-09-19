require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes
} = require("discord.js");

const {
    initializeDatabase
} = require("./utils/database");

const logger =
    require("./utils/logger");

const {
    initializeWarSystem
} = require("./systems/warSystem");

const {
    initializeCwlSystem
} = require("./systems/cwlSystem");

const {
    initializeCapitalSystem
} = require("./systems/capitalSystem");

const {
    initializeDonationSystem
} = require("./systems/donationSystem");

const {
    initializeAchievementSystem
} = require("./systems/achievementSystem");

const {
    initializeRankingSystem
} = require("./systems/rankingSystem");

const {
    initializeNotificationSystem
} = require("./systems/notificationSystem");

const {
    initializeInactivitySystem
} = require("./systems/inactivitySystem");


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands =
    new Collection();


/*
|--------------------------------------------------------------------------
| Load Commands
|--------------------------------------------------------------------------
*/

function loadCommands(directory) {
    if (!fs.existsSync(directory)) {
        return;
    }

    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        const fullPath =
            path.join(
                directory,
                entry.name
            );

        if (entry.isDirectory()) {
            loadCommands(fullPath);
            continue;
        }

        if (!entry.name.endsWith(".js")) {
            continue;
        }

        try {

            const command =
                require(fullPath);

            if (
                !command.data ||
                !command.execute
            ) {

                logger.warn(
                    `Skipped invalid command: ${fullPath}`
                );

                continue;
            }

            client.commands.set(
                command.data.name,
                command
            );

            logger.info(
                `Loaded command: /${command.data.name}`
            );

        } catch (error) {

            logger.error(
                `Failed loading command: ${fullPath}`
            );

            logger.error(error);
        }
    }
}


/*
|--------------------------------------------------------------------------
| Load Events
|--------------------------------------------------------------------------
*/

function loadEvents(directory) {

    if (!fs.existsSync(directory)) {
        return;
    }

    const files =
        fs.readdirSync(
            directory
        );

    for (const file of files) {

        if (!file.endsWith(".js")) {
            continue;
        }

        const fullPath =
            path.join(
                directory,
                file
            );

        try {

            const event =
                require(fullPath);

            if (
                !event.name ||
                !event.execute
            ) {

                logger.warn(
                    `Skipped invalid event: ${fullPath}`
                );

                continue;
            }

            if (event.once) {

                client.once(
                    event.name,
                    (...args) =>
                        event.execute(
                            ...args,
                            client
                        )
                );

            } else {

                client.on(
                    event.name,
                    (...args) =>
                        event.execute(
                            ...args,
                            client
                        )
                );
            }

            logger.info(
                `Loaded event: ${event.name}`
            );

        } catch (error) {

            logger.error(
                `Failed loading event: ${fullPath}`
            );

            logger.error(error);
        }
    }
}


/*
|--------------------------------------------------------------------------
| Automatically Register Slash Commands
|--------------------------------------------------------------------------
*/

async function registerCommands() {

    if (!process.env.DISCORD_TOKEN) {
        throw new Error(
            "DISCORD_TOKEN is missing."
        );
    }

    if (!process.env.DISCORD_CLIENT_ID) {
        throw new Error(
            "DISCORD_CLIENT_ID is missing."
        );
    }

    if (!process.env.DISCORD_GUILD_ID) {
        throw new Error(
            "DISCORD_GUILD_ID is missing."
        );
    }

    const commands = [];

    for (
        const command
        of client.commands.values()
    ) {

        try {

            commands.push(
                command.data.toJSON()
            );

        } catch (error) {

            logger.error(
                `Failed converting /${command.data.name} to JSON.`
            );

            logger.error(error);
        }
    }

    logger.info(
        `Registering ${commands.length} slash command(s)...`
    );

    const rest =
        new REST({
            version: "10"
        }).setToken(
            process.env.DISCORD_TOKEN
        );

    try {

        const registered =
            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.DISCORD_CLIENT_ID,
                    process.env.DISCORD_GUILD_ID
                ),
                {
                    body: commands
                }
            );

        logger.info(
            `Successfully registered ${registered.length} slash command(s).`
        );

    } catch (error) {

        logger.error(
            "Failed to register slash commands."
        );

        logger.error(error);

        throw error;
    }
}


/*
|--------------------------------------------------------------------------
| Initialize Systems
|--------------------------------------------------------------------------
*/

async function initializeSystems() {

    await initializeWarSystem(
        client
    );

    await initializeCwlSystem(
        client
    );

    await initializeCapitalSystem(
        client
    );

    await initializeDonationSystem(
        client
    );

    await initializeAchievementSystem(
        client
    );

    await initializeRankingSystem(
        client
    );

    await initializeNotificationSystem(
        client
    );

    await initializeInactivitySystem(
        client
    );
}


/*
|--------------------------------------------------------------------------
| Startup
|--------------------------------------------------------------------------
*/

async function start() {

    try {

        logger.info(
            "Starting WHITEOUT BOT..."
        );


        /*
        |--------------------------------------------------------------------------
        | Load Commands
        |--------------------------------------------------------------------------
        */

        loadCommands(
            path.join(
                __dirname,
                "commands"
            )
        );


        /*
        |--------------------------------------------------------------------------
        | Load Events
        |--------------------------------------------------------------------------
        */

        loadEvents(
            path.join(
                __dirname,
                "events"
            )
        );


        /*
        |--------------------------------------------------------------------------
        | Database
        |--------------------------------------------------------------------------
        */

        await initializeDatabase();


        /*
        |--------------------------------------------------------------------------
        | Automatically Register Commands
        |--------------------------------------------------------------------------
        */

        await registerCommands();


        /*
        |--------------------------------------------------------------------------
        | Initialize Systems
        |--------------------------------------------------------------------------
        */

        await initializeSystems();


        /*
        |--------------------------------------------------------------------------
        | Login
        |--------------------------------------------------------------------------
        */

        if (!process.env.DISCORD_TOKEN) {

            throw new Error(
                "DISCORD_TOKEN is missing."
            );
        }

        await client.login(
            process.env.DISCORD_TOKEN
        );

    } catch (error) {

        logger.error(
            "Whiteout failed to start."
        );

        logger.error(error);

        process.exit(1);
    }
}


start();
