const PLATFORMS = {
    pc: "PC · Uplay",
    psn: "PlayStation",
    xbl: "Xbox",
};

const RECENT_KEY = "r6career-recent";

function recentSearches() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch {
        return [];
    }
}

function rememberSearch(entry) {
    const next = [entry, ...recentSearches().filter((item) => item.username !== entry.username || item.platform !== entry.platform)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    renderRecent();
}

function renderRecent() {
    const grid = document.getElementById("recent-grid");
    if (!grid) return;
    const items = recentSearches();
    grid.innerHTML = "";
    if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "recent-empty";
        empty.textContent = "Nenhuma busca ainda. O perfil que você consultar aparece aqui.";
        grid.appendChild(empty);
        return;
    }
    items.forEach((item) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "player-card";
        const top = document.createElement("div");
        top.className = "card-top";
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = item.username.slice(0, 3).toUpperCase();
        const rank = document.createElement("div");
        rank.className = "rank-tag";
        rank.textContent = item.rank || "Sem rank";
        top.append(avatar, rank);
        const name = document.createElement("div");
        name.className = "card-name";
        name.textContent = item.username;
        const plat = document.createElement("div");
        plat.className = "card-plat";
        plat.textContent = PLATFORMS[item.platform] || item.platform;
        card.append(top, name, plat);
        card.addEventListener("click", () => {
            document.getElementById("searchInput").value = item.username;
            document.getElementById("platform").value = item.platform;
            buscar();
        });
        grid.appendChild(card);
    });
}

function statValue(value, suffix) {
    if (value === null || value === undefined || value === "") return "—";
    return suffix ? `${value}${suffix}` : String(value);
}

function renderPlayer(player) {
    const box = document.getElementById("player-result");
    box.hidden = false;
    box.innerHTML = "";

    const tag = document.createElement("div");
    tag.className = "tag";
    tag.textContent = "Resultado";

    const card = document.createElement("article");
    card.className = "result-card";

    const head = document.createElement("div");
    head.className = "result-head";
    if (player.avatar && /^https?:\/\//i.test(player.avatar)) {
        const img = document.createElement("img");
        img.src = player.avatar;
        img.alt = "";
        img.className = "result-avatar";
        head.appendChild(img);
    }
    const title = document.createElement("div");
    const name = document.createElement("h2");
    name.textContent = player.username;
    const meta = document.createElement("p");
    const bits = [PLATFORMS[player.platform] || player.platform];
    if (player.level) bits.push(`Nível ${player.level}`);
    if (player.stats.rank) bits.push(player.stats.rank);
    meta.textContent = bits.join(" · ");
    title.append(name, meta);
    head.appendChild(title);

    const stats = document.createElement("div");
    stats.className = "card-stats";
    [
        ["K/D", statValue(player.stats.kd)],
        ["Win", statValue(player.stats.winRate)],
        ["HS", statValue(player.stats.headshotRate, player.stats.headshotRate ? "%" : "")],
        ["Kills", statValue(player.stats.kills)],
        ["Vitórias", statValue(player.stats.wins)],
        ["Partidas", statValue(player.stats.matches)],
    ].forEach(([key, val]) => {
        const cell = document.createElement("div");
        const number = document.createElement("span");
        number.className = "stat-val";
        number.textContent = val;
        const label = document.createElement("span");
        label.className = "stat-key";
        label.textContent = key;
        cell.append(number, label);
        stats.appendChild(cell);
    });

    card.append(head, stats);
    box.append(tag, card);
    box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderStatus(message) {
    const box = document.getElementById("player-result");
    box.hidden = false;
    box.innerHTML = "";
    const text = document.createElement("p");
    text.className = "result-status";
    text.textContent = message;
    box.appendChild(text);
}

async function buscar() {
    const input = document.getElementById("searchInput");
    const platform = document.getElementById("platform");
    const button = document.getElementById("searchButton");
    const username = input.value.trim();
    if (!username) {
        renderStatus("Digite o username do jogador.");
        return;
    }

    button.disabled = true;
    button.textContent = "Buscando...";
    renderStatus("Consultando " + username + "...");
    try {
        const response = await fetch("/player/" + encodeURIComponent(platform.value) + "/" + encodeURIComponent(username));
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            renderStatus(data.error || "Não foi possível buscar esse jogador.");
            return;
        }
        renderPlayer(data);
        rememberSearch({
            username: data.username,
            platform: data.platform,
            rank: data.stats && data.stats.rank,
        });
    } catch {
        renderStatus("O servidor não respondeu. Rode npm start e abra o site por localhost.");
    } finally {
        button.disabled = false;
        button.textContent = "Buscar";
    }
}

const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") buscar();
    });
}

renderRecent();

const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("on");
            io.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
