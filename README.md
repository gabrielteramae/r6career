# R6Career

> R6Career é um projeto que demonstra seu painel de estatísticas do jogo Rainbow Six Siege.

## Funcionalidades

- 🔍 **Busca de Jogador** — busque qualquer jogador por username e plataforma
- 📊 **Stats de Carreira** — rank, K/D, win rate, headshot %, tempo de jogo e mais
- 🧠 **Stats por Operador** — desempenho detalhado por operador
- 🕹️ **Histórico de Partidas** — partidas recentes com resultado, mapa, kills e score
- 🌍 **Multiplataforma** — PC, PlayStation e Xbox

## Tecnologias

| Camada         | Tecnologia                    |
| -------------- | ----------------------------- |
| Frontend       | HTML + CSS + JavaScript       |
| Backend        | Node.js + Express             |
| Cache          | Redis                         |
| Banco de dados | PostgreSQL                    |
| Fonte de dados | Ubisoft API (`@rainbow6/api`) |
| Deploy         | Vercel                        |

## Como Rodar

```bash
npm install
cp .env.example .env
npm start
```

Abra `http://localhost:3000`. A busca usa a API da Ubisoft quando `UBI_EMAIL` e `UBI_PASSWORD` estão no `.env`. Sem isso, o servidor tenta a fonte pública e avisa se ela estiver bloqueada.

### Pré-requisitos

- Node.js 18+
- Redis (local ou via Upstash)
- PostgreSQL
- Conta Ubisoft própria para autenticação

> ⚠️ **Obs:** as credenciais Ubisoft são usadas apenas para autenticar na API e buscar dados públicos de jogadores. Nunca compartilhe suas variáveis de ambiente.

## Licença

© 2026 Gabriel Teramae Chan. Todos os direitos reservados. [Gabriel Teramae Chan](https://github.com/gabrielteramae)
