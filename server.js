const path = require("path");
const express = require("express");
require("dotenv").config();

const { getPlayer, connectAccount, connected } = require("./lib/ubisoft");

const app = express();
const PORT = process.env.PORT || 3000;
const loginAttempts = new Map();

app.disable("x-powered-by");
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
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

app.get("/api/health", (req, res) => {
    res.json({ ok: true, connected: connected() });
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
        res.json({ ok: true });
    } catch {
        console.error("Login Ubisoft recusado");
        res.status(401).json({
            error: "Não foi possível entrar na Ubisoft. Confira o e-mail e a senha. A conta não pode pedir código.",
        });
    }
});

app.get("/player/:platform/:username", async (req, res) => {
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
