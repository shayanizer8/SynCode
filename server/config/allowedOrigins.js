const parseConfiguredOrigins = (rawValue) =>
  String(rawValue || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const buildAllowedOriginChecker = () => {
  const configuredOrigins = parseConfiguredOrigins(process.env.CLIENT_URL);
  const fallbackOrigins = ["http://localhost:5173", "http://localhost:5174"];
  const allowedOrigins = new Set(configuredOrigins.length > 0 ? configuredOrigins : fallbackOrigins);

  return (origin) => {
    if (!origin) {
      return true;
    }

    if (allowedOrigins.has(origin)) {
      return true;
    }

    return process.env.NODE_ENV !== "production" && LOCALHOST_PATTERN.test(origin);
  };
};

module.exports = {
  buildAllowedOriginChecker,
};
