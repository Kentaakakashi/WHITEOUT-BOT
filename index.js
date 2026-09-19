require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
    Client,
    Collection,
    GatewayIntentBits
} = require("discord.js");

const { initializeDatabase } = require("./utils/database");
const logger = require("./utils/logger");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

/*
|--------------------------------------------------------------------------
| Load Commands
|--------------------------------------------------------------------------
*/

function loadCommands(directory) {
    if (!fs.existsSync(directory)) {
        return;
    }

    const entries = fs.readdirSync(directory, {
        withFileTypes: true
    });

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            loadCommands(fullPath);
            continue;
        }

        if (!entry.name.endsWith(".js")) {
            continue;
        }

        try {
            const command = require(fullPath);

            if (!command.data || !command.execute) {
                logger.warn(`Skipped invalid command: ${fullPath}`);
                continue;
            }

            client.commands.set(command.data.name, command);

            logger.info(`Loaded command: /${command.data.name}`);
        } catch (error) {
            logger.error(`Failed loading command: ${fullPath}`);
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

    const files = fs.readdirSync(directory);

    for (const file of files) {
        if (!file.endsWith(".js")) {
            continue;
        }

        const fullPath = path.join(directory, file);

        try {
            const event = require(fullPath);

            if (!event.name || !event.execute) {
                logger.warn(`Skipped invalid event: ${fullPath}`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => {
                    event.execute(...args, client);
                });
            } else {
                client.on(event.name, (...args) => {
                    event.execute(...args, client);
                });
            }

            logger.info(`Loaded event: ${event.name}`);
        } catch (error) {
            logger.error(`Failed loading event: ${fullPath}`);
            logger.error(error);
        }
    }
}

/*
|--------------------------------------------------------------------------
| Startup
|--------------------------------------------------------------------------
*/

async function start() {
    try {
        logger.info("Starting WHITEOUT BOT...");

        loadCommands(path.join(__dirname, "commands"));
        loadEvents(path.join(__dirname, "events"));

        await initializeDatabase();

        if (!process.env.DISCORD_TOKEN) {
            throw new Error("DISCORD_TOKEN is missing.");
        }

        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        logger.error("Whiteout failed to start.");
        logger.error(error);

        process.exit(1);
    }
}

start();
