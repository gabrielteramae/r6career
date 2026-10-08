# R6Career — busca de jogador do Siege

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)

Páginas estáticas (busca, operadores e leaderboard) e um Express que consulta a Ubisoft com `r6api.js`. Operadores e leaderboard só filtram o HTML local: `operators.js` e `leaderboard.js` não chamam a API. A busca devolve um JSON de jogador, não um endpoint separado de estatísticas.

| Escolha | Motivo |
| --- | --- |
| Sessão antes da consulta | `getPlayer` em `lib/ubisoft.js` só chama a Ubisoft se `POST /api/ubisoft` criou a sessão. Sem o cookie, `GET /player/:platform/:username` responde 401 |

## Stack

- HTML, CSS e JavaScript. GSAP 3 entra por CDN nas páginas
- Node.js, Express 5, `r6api.js`, axios e dotenv
- Rotas de `server.js`:
  - `GET /api/health`
  - `POST /api/ubisoft` com e-mail e senha; grava o cookie `r6session`
  - `POST /api/logout`
  - `GET /player/:platform/:username` — o select usa `pc`, `psn` e `xbl`

O JSON do jogador, quando a Ubisoft responde, traz perfil, `stats` (rank, MMR, K/D, win rate, headshot, abates, mortes, assistências, vitórias, derrotas, partidas, tempo), resumo ranked/casual e até seis operadores. Não há rota de histórico de partidas.

## Estrutura

```
index.html
operators.html
leaderboard.html
404.html
script.js
operators.js
leaderboard.js
style.css
operators.css
leaderboard.css
404.css
server.js
lib/ubisoft.js
package.json
.env.example
images/
```

## Como rodar

```bash
git clone https://github.com/gabrielteramae/r6career.git
cd r6career
npm install
npm start
```

Abra http://localhost:3000. `npm run dev` usa nodemon.

O processo lê `PORT` (padrão 3000). O login é o formulário, não `UBI_EMAIL` nem `UBI_PASSWORD` do `.env.example`: o servidor não lê essas duas variáveis. A mensagem de erro do login diz que a conta não pode pedir código.

---

© 2026 Gabriel Teramae Chan
