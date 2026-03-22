const axios = require('axios');

async function getPlayer(username, platform) {
    try {
        const response = await axios.get(
            `https://r6.tracker.network/api/v2/standard/profile/ubi/${username}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            }
        );

        const data = response.data.data;
        const stats = data.segments[0].stats;

        return {
            username: data.platformInfo.platformUserHandle,
            id: data.platformInfo.platformUserId,
            platform,
            avatar: data.platformInfo.avatarUrl,
            stats: {
                mmr: stats.mmr?.value,
                rank: stats.rankText?.value,
                kd: stats.kd?.value,
                winRate: stats.wlPercentage?.value,
                kills: stats.kills?.value,
                wins: stats.wins?.value
            }
        };
    } catch (error) {
        console.error('Erro ao buscar jogador:', error.message);
        return null;
    }
}

module.exports = { getPlayer };