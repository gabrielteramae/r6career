const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { getPlayer } = require('./lib/ubisoft');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'R6Career API rodando!' });
});

app.get('/player/:platform/:username', async (req, res) => {
    const { platform, username } = req.params;

    const player = await getPlayer(username, platform);

    if (!player) {
        return res.status(404).json({ error: 'Jogador não encontrado' });
    }

    res.json(player);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});