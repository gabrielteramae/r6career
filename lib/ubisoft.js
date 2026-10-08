const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
const R6API = require("r6api.js").default;

const authDir = path.join(os.tmpdir(), "r6career-auth");
const authFile = path.join(authDir, "ticket.json");

let credentials = null;
let session = null;

function lockAuthDir() {
    fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(authDir, 0o700);
}

function connected() {
    return Boolean(session);
}

async function connectAccount(email, password) {
    lockAuthDir();
    const previous = credentials;
    const api = new R6API({ email, password, authFilePath: authFile });
    try {
        await api.getTicket();
    } catch (error) {
        if (previous) {
            new R6API({
                email: previous.email,
                password: previous.password,
                authFilePath: authFile,
            });
        } else {
            api.setCredentials("", "");
            fs.rmSync(authFile, { force: true });
        }
        throw error;
    }
    try {
        fs.chmodSync(authFile, 0o600);
    } catch {
        fs.rmSync(authFile, { force: true });
    }
    credentials = { email, password };
    session = { api };
}

function disconnect() {
    if (session) session.api.setCredentials("", "");
    credentials = null;
    session = null;
    fs.rmSync(authFile, { force: true });
}

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

function queueSummary(queue) {
    if (!queue || !queue.matches) return null;
    return {
        kd: roundKd(queue.kd),
        winRate: queue.winRate || null,
        kills: queue.kills,
        wins: queue.wins,
        losses: queue.losses,
        matches: queue.matches,
    };
}

async function fromUbisoft(username, platform) {
    const ubiPlatform = UBI_PLATFORMS[String(platform || "").toLowerCase()] || "uplay";
    const api = session.api;
    const found = await api.findByUsername(ubiPlatform, username);
    if (!found.length) return { error: "not_found" };

    const profile = found[0];
    const [stats] = await api.getStats(ubiPlatform, profile.id, {
        categories: ["generalpvp", "operatorspvp", "queuespvp"],
    });
    const general = stats?.pvp?.general;
    if (!general) return { error: "not_found" };

    let rank = { rank: null, mmr: null };
    let level = null;
    try {
        const ranks = await api.getRanks(ubiPlatform, profile.id);
        rank = pickRank(ranks);
    } catch (error) {
        console.error("Rank indisponível");
    }
    try {
        const [progression] = await api.getProgression(ubiPlatform, profile.id);
        level = progression?.level ?? null;
    } catch (error) {
        console.error("Nível indisponível");
    }

    const ranked = queueSummary(stats?.pvp?.queues?.ranked);
    const casual = queueSummary(stats?.pvp?.queues?.casual);
    const operators = Object.values(stats?.pvp?.operators || {})
        .filter((operator) => operator.matches > 0 || operator.playtime > 0)
        .sort((a, b) => b.playtime - a.playtime)
        .slice(0, 6)
        .map((operator) => ({
            name: operator.name,
            role: operator.role,
            kd: roundKd(operator.kd),
            winRate: operator.winRate || null,
            matches: operator.matches,
        }));

    const avatar = profile.avatar?.["256"] || profile.avatar?.["146"] || null;
    return {
        player: {
            username: profile.username,
            platform,
            avatar: typeof avatar === "string" && avatar.startsWith("https://") ? avatar : null,
            level,
            stats: {
                mmr: rank.mmr,
                rank: rank.rank,
                kd: roundKd(general.kd),
                winRate: general.winRate || null,
                headshotRate: headshotRate(general.headshots, general.kills),
                kills: general.kills,
                deaths: general.deaths,
                assists: general.assists,
                wins: general.wins,
                losses: general.losses,
                matches: general.matches,
                playtime: general.playtime,
            },
            ranked,
            casual,
            operators,
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
    if (!name || name.length > 20 || !/^[A-Za-z0-9][A-Za-z0-9._\- ]{0,19}$/.test(name)) {
        return { error: "not_found" };
    }
    if (!UBI_PLATFORMS[String(platform || "").toLowerCase()]) {
        return { error: "not_found" };
    }
    if (!session) return { error: "needs_ubisoft" };

    try {
        return await fromUbisoft(name, platform);
    } catch (error) {
        console.error("Consulta Ubisoft falhou");
        const message = String(error.message || "");
        if (/not found|no profile|404/i.test(message)) return { error: "not_found" };
        if (/2fa|two-factor|two factor|mfa/i.test(message)) {
            return { error: "needs_ubisoft", message: "Essa conta pede um código de verificação." };
        }
        return { error: "upstream", message: "A Ubisoft não devolveu as estatísticas desse jogador." };
    }
}

module.exports = { getPlayer, connectAccount, connected, disconnect };
