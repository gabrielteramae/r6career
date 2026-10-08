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

app.get("/player/:platform/:username", async (req, res) => {
    const { platform, username } = req.params;
    const result = await getPlayer(username, platform);

    if (result.error === "not_found") {
        return res.status(404).json({ error: "Jogador não encontrado nessa plataforma." });
    }
    if (result.error === "missing_credentials") {
        return res.status(503).json({
            error: "A consulta pública está bloqueada. Coloque UBI_EMAIL e UBI_PASSWORD no .env e reinicie o servidor.",
        });
    }
    if (result.error || !result.player) {
        return res.status(502).json({ error: "Não foi possível consultar as estatísticas agora." });
    }

    res.json(result.player);
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
    console.log(`R6Career em http://localhost:${PORT}`);
});
