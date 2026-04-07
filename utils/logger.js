import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "api.log");

// Logs papkasini yaratish
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Vaqtni formatlash
const formatDate = (date) => {
  return date.toISOString().replace("T", " ").substring(0, 23);
};

// Log yozish
const writeLog = (entry) => {
  const line = JSON.stringify(entry) + "\n";
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error("Log yozishda xatolik:", err.message);
  });
};

// Request/Response logger middleware
const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);

  // Request ma'lumotlarini yig'ish
  const requestLog = {
    id: requestId,
    timestamp: formatDate(new Date()),
    type: "REQUEST",
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("User-Agent"),
    body: req.method !== "GET" ? sanitizeBody(req.body) : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  };

  writeLog(requestLog);

  // Original res.json ni saqlash
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = (body) => {
    logResponse(requestId, req, res, startTime, body);
    return originalJson(body);
  };

  res.send = (body) => {
    // Faqat json bo'lmagan responslarni log qilish
    if (typeof body === "string" && !res._loggedResponse) {
      logResponse(requestId, req, res, startTime, body);
    }
    return originalSend(body);
  };

  next();
};

const logResponse = (requestId, req, res, startTime, body) => {
  if (res._loggedResponse) return;
  res._loggedResponse = true;

  const duration = Date.now() - startTime;

  const responseLog = {
    id: requestId,
    timestamp: formatDate(new Date()),
    type: "RESPONSE",
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    body: sanitizeResponseBody(body),
  };

  writeLog(responseLog);
};

// Parol va tokenlarni yashirish
const sanitizeBody = (body) => {
  if (!body || typeof body !== "object") return body;
  const sanitized = { ...body };
  const sensitiveKeys = ["password", "token", "authorization", "secret", "apiKey"];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = "***";
    }
  }
  return sanitized;
};

// Response body ni qisqartirish (katta bo'lsa)
const sanitizeResponseBody = (body) => {
  if (!body) return body;
  try {
    const str = typeof body === "string" ? body : JSON.stringify(body);
    if (str.length > 1000) {
      return JSON.parse(str.substring(0, 1000) + '..."');
    }
    return typeof body === "string" ? body : body;
  } catch {
    return "[body parse error]";
  }
};

export default loggerMiddleware;
