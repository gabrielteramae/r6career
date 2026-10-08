const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { getPlayer } = require("./lib/ubisoft");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        source: process.env.UBI_EMAIL && process.env.UBI_PASSWORD ? "ubisoft" : "tracker",
    });
});

app.post("/api/ubisoft", async (req, res) => {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    if (!email || !password || email.length > 200 || password.length > 200) {
        return res.status(400).json({ error: "Informe o e-mail e a senha da Ubisoft." });
    }

    process.env.UBI_EMAIL = email;
    process.env.UBI_PASSWORD = password;

    try {
        const R6API = require("r6api.js").default;
        const api = new R6API({ email, password });
        await api.getTicket();
        res.json({ ok: true });
    } catch (error) {
        delete process.env.UBI_EMAIL;
        delete process.env.UBI_PASSWORD;
        const message = String(error.message || "");
        const needsCode = /2fa|two-factor|two factor|mfa|code/i.test(message);
        res.status(401).json({
            error: needsCode
                ? "Essa conta pede um código. Use uma conta Ubisoft sem verificação em duas etapas."
                : "Não foi possível entrar na Ubisoft. Confira o e-mail e a senha.",
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

app.use(express.static(path.join(__dirname)));

app.listen(PORT, "0.0.0.0", () => {
    console.log(`R6Career em http://0.0.0.0:${PORT}`);
});
