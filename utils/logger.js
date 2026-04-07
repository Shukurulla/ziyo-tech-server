import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "api.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// DD.MM.YYYY HH:MM formatda vaqt
const formatDate = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${d}.${m}.${y} ${h}:${min}`;
};

// Maxfiy ma'lumotlarni yashirish
const sanitize = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const copy = { ...obj };
  const hidden = ["password", "token", "authorization", "secret", "apikey"];
  for (const key of Object.keys(copy)) {
    if (hidden.some((h) => key.toLowerCase().includes(h))) {
      copy[key] = "***";
    }
  }
  return copy;
};

// Body ni qisqartirish
const trimBody = (body) => {
  if (!body) return "-";
  try {
    const str = typeof body === "string" ? body : JSON.stringify(body);
    return str.length > 500 ? str.substring(0, 500) + "..." : str;
  } catch {
    return "[parse error]";
  }
};

// Faylga yozish
const writeLine = (line) => {
  fs.appendFileSync(LOG_FILE, line + "\n");
};

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  // response body ni ushlab qolish
  const chunks = [];
  const originalWrite = res.write;
  const originalEnd = res.end;

  res.write = function (chunk, ...args) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return originalWrite.apply(res, [chunk, ...args]);
  };

  res.end = function (chunk, ...args) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

    const duration = Date.now() - start;
    const time = formatDate();

    // Response body
    let responseBody = "-";
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      responseBody = trimBody(raw);
    } catch {
      responseBody = "[read error]";
    }

    // Request body
    const reqBody =
      req.method !== "GET" && req.body && Object.keys(req.body).length > 0
        ? JSON.stringify(sanitize(req.body))
        : "-";

    const line = [
      `[${time}]`,
      req.method,
      req.originalUrl,
      `=> ${res.statusCode}`,
      `(${duration}ms)`,
      `| REQ: ${reqBody}`,
      `| RES: ${responseBody}`,
    ].join(" ");

    writeLine(line);

    return originalEnd.apply(res, [chunk, ...args]);
  };

  next();
};

export default loggerMiddleware;
