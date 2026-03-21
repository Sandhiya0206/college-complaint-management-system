const LOCAL_DEV_ORIGIN = 'http://localhost:5173';

const normalizeOrigin = (value = '') => String(value).trim().replace(/\/+$/, '');

const parseCsv = (value = '') => String(value)
  .split(',')
  .map((entry) => normalizeOrigin(entry))
  .filter(Boolean);

const getConfiguredOrigins = () => {
  const origins = new Set([normalizeOrigin(LOCAL_DEV_ORIGIN), ...parseCsv(process.env.CLIENT_URLS)]);
  const clientUrl = normalizeOrigin(process.env.CLIENT_URL || '');
  if (clientUrl) origins.add(clientUrl);
  return origins;
};

const isVercelDomain = (origin = '') => /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

const shouldAllowVercelPreviews = (configuredOrigins) => {
  const flag = String(process.env.ALLOW_VERCEL_PREVIEWS || '').trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return [...configuredOrigins].some((origin) => origin.endsWith('.vercel.app'));
};

const createOriginValidator = () => {
  const configuredOrigins = getConfiguredOrigins();
  const allowVercelPreviews = shouldAllowVercelPreviews(configuredOrigins);

  return (origin, callback) => {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    if (configuredOrigins.has(normalizedOrigin)) return callback(null, true);
    if (allowVercelPreviews && isVercelDomain(normalizedOrigin)) return callback(null, true);

    return callback(new Error(`CORS blocked for origin: ${normalizedOrigin}`), false);
  };
};

const corsOptions = {
  origin: createOriginValidator(),
  credentials: true
};

module.exports = {
  corsOptions
};