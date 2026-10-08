const crypto = require("crypto");
const path = require("path");
const express = require("express");
require("dotenv").config();

const { getPlayer, connectAccount, disconnect } = require("./lib/ubisoft");

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE = "r6session";
const SESSION_MS = 60 * 60 * 1000;
const loginAttempts = new Map();
let browserSession = null;

app.disable("x-powered-by");
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    );
    next();
});
app.use(express.json({ limit: "1kb" }));

function loginAllowed(ip) {
    const now = Date.now();
    const recent = (loginAttempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
    if (recent.length >= 5) {
        loginAttempts.set(ip, recent);
        return false;
    }
    recent.push(now);
    loginAttempts.set(ip, recent);
    return true;
}

function readCookie(req) {
    const header = req.headers.cookie || "";
    const piece = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
    if (!piece) return "";
    try {
        return decodeURIComponent(piece.slice(COOKIE.length + 1));
    } catch {
        return "";
    }
}

function sessionValid(req) {
    if (!browserSession || browserSession.expires < Date.now()) return false;
    const token = readCookie(req);
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    const hash = crypto.createHash("sha256").update(token).digest();
    return crypto.timingSafeEqual(hash, browserSession.hash);
}

function startBrowserSession(res) {
    const token = crypto.randomBytes(32).toString("hex");
    browserSession = {
        hash: crypto.createHash("sha256").update(token).digest(),
        expires: Date.now() + SESSION_MS,
    };
    res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`);
}

function endBrowserSession(res) {
    browserSession = null;
    disconnect();
    res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

app.get("/api/health", (req, res) => {
    res.json({ ok: true });
});

app.post("/api/ubisoft", async (req, res) => {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    if (req.body) req.body.password = "";

    const ip = req.socket.remoteAddress || "local";
    if (!loginAllowed(ip)) {
        return res.status(429).json({ error: "Muitas tentativas. Espere alguns minutos." });
    }
    if (!email || !password || email.length > 200 || password.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Informe o e-mail e a senha da Ubisoft." });
    }

    try {
        await connectAccount(email, password);
        startBrowserSession(res);
        res.json({ ok: true });
    } catch {
        console.error("Login Ubisoft recusado");
        res.status(401).json({
            error: "Não foi possível entrar na Ubisoft. Confira o e-mail e a senha. A conta não pode pedir código.",
        });
    }
});

app.post("/api/logout", (req, res) => {
    if (sessionValid(req)) endBrowserSession(res);
    else res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
    res.json({ ok: true });
});

app.get("/player/:platform/:username", async (req, res) => {
    if (!sessionValid(req)) {
        return res.status(401).json({
            code: "needs_ubisoft",
            error: "Entre com a Ubisoft para consultar.",
        });
    }

    const { platform, username } = req.params;
    const result = await getPlayer(username, platform);

    if (result.error === "not_found") {
        return res.status(404).json({ error: "Jogador não encontrado nessa plataforma." });
    }
    if (result.error === "needs_ubisoft") {
        return res.status(503).json({
            code: "needs_ubisoft",
            error: "Para consultar de verdade, entre com uma conta Ubisoft.",
        });
    }
    if (result.error || !result.player) {
        return res.status(502).json({ error: result.message || "Não foi possível consultar as estatísticas agora." });
    }

    res.json(result.player);
});

app.use(express.static(path.join(__dirname), { dotfiles: "deny" }));

app.listen(PORT, "0.0.0.0", () => {
    console.log(`R6Career em http://0.0.0.0:${PORT}`);
});
