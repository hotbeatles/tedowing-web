import winston from "winston";

const { combine, timestamp, label, printf, colorize } = winston.format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const options = {
  console: {
    level: "debug",
    handleExceptions: true,
    json: false,
    format: combine(label({ label: "express_server" }), timestamp(), colorize(), myFormat),
  },
};

let logger = new winston.createLogger({
  transports: [new winston.transports.Console(options.console)],
  exitOnError: false, // do not exit on handled exceptions
});

logger.stream = {
  write: function (message, encoding) {
    logger.info(message);
  },
};

export default logger;
