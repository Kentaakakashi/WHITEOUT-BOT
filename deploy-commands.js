require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    REST,
    Routes
} = require("discord.js");

const logger = require("./utils/logger");

const commands = [];

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

        const command = require(fullPath);

        if (!command.data) {
            continue;
        }

        commands.push(command.data.toJSON());
    }
}

async function deploy() {
    if (!process.env.DISCORD_TOKEN) {
        throw new Error("DISCORD_TOKEN is missing.");
    }

    if (!process.env.DISCORD_CLIENT_ID) {
        throw new Error("DISCORD_CLIENT_ID is missing.");
    }

    if (!process.env.DISCORD_GUILD_ID) {
        throw new Error("DISCORD_GUILD_ID is missing.");
    }

    loadCommands(path.join(__dirname, "commands"));

    const rest = new REST({
        version: "10"
    }).setToken(process.env.DISCORD_TOKEN);

    logger.info(`Deploying ${commands.length} slash command(s)...`);

    await rest.put(
        Routes.applicationGuildCommands(
            process.env.DISCORD_CLIENT_ID,
            process.env.DISCORD_GUILD_ID
        ),
        {
            body: commands
        }
    );

    logger.info("Slash commands deployed successfully.");
}

deploy().catch((error) => {
    logger.error("Failed to deploy slash commands.");
    logger.error(error);

    process.exit(1);
});
