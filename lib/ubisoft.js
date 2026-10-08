const axios = require("axios");
const R6API = require("r6api.js").default;

const TRACKER_PLATFORMS = {
    pc: "ubi",
    ubi: "ubi",
    uplay: "ubi",
    psn: "psn",
    playstation: "psn",
    xbox: "xbl",
    xbl: "xbl",
};

const UBI_PLATFORMS = {
    pc: "uplay",
    ubi: "uplay",
    uplay: "uplay",
    psn: "psn",
    playstation: "psn",
    xbox: "xbl",
    xbl: "xbl",
};

function roundKd(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.round(number * 100) / 100;
}

function headshotRate(headshots, kills) {
    if (!kills) return null;
    return Math.round((headshots / kills) * 1000) / 10;
}

function pickRank(ranks) {
    const seasons = ranks?.[0]?.seasons || {};
    const seasonIds = Object.keys(seasons);
    for (let i = seasonIds.length - 1; i >= 0; i -= 1) {
        const regions = seasons[seasonIds[i]]?.regions || {};
        for (const region of Object.values(regions)) {
            const ranked = region.boards?.ranked;
            if (ranked?.current?.name) {
                return {
                    rank: ranked.current.name,
                    mmr: Number.isFinite(ranked.current.mmr) ? Math.round(ranked.current.mmr) : null,
                };
            }
        }
    }
    return { rank: null, mmr: null };
}

async function fromUbisoft(username, platform) {
    const ubiPlatform = UBI_PLATFORMS[String(platform || "").toLowerCase()] || "uplay";
    const api = new R6API({
        email: process.env.UBI_EMAIL,
        password: process.env.UBI_PASSWORD,
    });
    const found = await api.findByUsername(ubiPlatform, username);
    if (!found.length) return { error: "not_found" };

    const profile = found[0];
    const [stats] = await api.getStats(ubiPlatform, profile.id);
    const general = stats?.pvp?.general;
    if (!general) return { error: "not_found" };

    let rank = { rank: null, mmr: null };
    let level = null;
    try {
        const ranks = await api.getRanks(ubiPlatform, profile.id);
        rank = pickRank(ranks);
    } catch (error) {
        console.error("Rank indisponível:", error.message);
    }
    try {
        const [progression] = await api.getProgression(ubiPlatform, profile.id);
        level = progression?.level ?? null;
    } catch (error) {
        console.error("Nível indisponível:", error.message);
    }

    return {
        player: {
            username: profile.username,
            id: profile.id,
            platform,
            avatar: profile.avatar?.["256"] || profile.avatar?.["146"] || null,
            level,
            stats: {
                mmr: rank.mmr,
                rank: rank.rank,
                kd: roundKd(general.kd),
                winRate: general.winRate || null,
                headshotRate: headshotRate(general.headshots, general.kills),
                kills: general.kills,
                wins: general.wins,
                deaths: general.deaths,
                matches: general.matches,
            },
        },
    };
}

async function fromTracker(username, platform) {
    const trackerPlatform = TRACKER_PLATFORMS[String(platform || "").toLowerCase()] || "ubi";
    const response = await axios.get(
        `https://r6.tracker.network/api/v2/standard/profile/${trackerPlatform}/${encodeURIComponent(username)}`,
        {
            headers: {
                "User-Agent": "Mozilla/5.0",
                Accept: "application/json",
            },
            timeout: 12000,
            validateStatus: () => true,
        }
    );

    if (response.status === 404) return { error: "not_found" };
    if (response.status === 403 || response.status === 429 || response.status >= 500) {
        return { error: "upstream" };
    }
    if (response.status !== 200 || !response.data?.data) return { error: "upstream" };

    const data = response.data.data;
    const stats = data.segments?.[0]?.stats || {};
    return {
        player: {
            username: data.platformInfo.platformUserHandle,
            id: data.platformInfo.platformUserId,
            platform,
            avatar: data.platformInfo.avatarUrl,
            level: null,
            stats: {
                mmr: stats.mmr?.value ?? null,
                rank: stats.rankText?.value ?? null,
                kd: stats.kd?.value ?? null,
                winRate: stats.wlPercentage?.displayValue || stats.wlPercentage?.value || null,
                headshotRate: stats.headshotPct?.value ?? null,
                kills: stats.kills?.value ?? null,
                wins: stats.wins?.value ?? null,
                deaths: stats.deaths?.value ?? null,
                matches: stats.matchesPlayed?.value ?? null,
            },
        },
    };
}

async function getPlayer(username, platform) {
    const name = String(username || "").trim();
    if (!name) return { error: "not_found" };

    if (process.env.UBI_EMAIL && process.env.UBI_PASSWORD) {
        try {
            return await fromUbisoft(name, platform);
        } catch (error) {
            const message = String(error.message || "");
            console.error("Erro Ubisoft:", message);
            if (/not found|no profile|404/i.test(message)) return { error: "not_found" };
            if (/2fa|two-factor|two factor|mfa/i.test(message)) {
                return { error: "needs_ubisoft", message: "Essa conta pede um código de verificação." };
            }
            return { error: "upstream", message: "A Ubisoft não devolveu as estatísticas desse jogador." };
        }
    }

    try {
        const tracker = await fromTracker(name, platform);
        if (!tracker.error) return tracker;
        if (tracker.error === "not_found") return tracker;
        return { error: "needs_ubisoft" };
    } catch (error) {
        console.error("Erro ao buscar jogador:", error.message);
        return { error: "needs_ubisoft" };
    }
}

module.exports = { getPlayer };
