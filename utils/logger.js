function timestamp() {
    return new Date().toISOString();
}

function info(message) {
    console.log(`[${timestamp()}] [INFO] ${message}`);
}

function warn(message) {
    console.warn(`[${timestamp()}] [WARN] ${message}`);
}

function error(message) {
    console.error(`[${timestamp()}] [ERROR] ${message}`);
}

function debug(message) {
    if (process.env.NODE_ENV === "development") {
        console.log(`[${timestamp()}] [DEBUG] ${message}`);
    }
}

module.exports = {
    info,
    warn,
    error,
    debug
};
