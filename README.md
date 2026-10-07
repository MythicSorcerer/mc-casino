# Mythic's Casino

Mythic's Casino is a planned web games and wallet experience connected to a Minecraft server. Players are intended to deposit and withdraw server currency through a small Fabric client, then play games such as coinflip, roulette, crash, lottery, and chicken on the website.

**Project stage:** local demo app. The `web/` folder contains a redesigned Vite/React UI and a local Node + SQLite demo API with five server-settled game modes. It is not connected to real accounts, Minecraft payments, or a production database. See [web/README.md](web/README.md), [STATUS.md](STATUS.md), and [ROADMAP.md](ROADMAP.md).

> **Legal warning:** Mythic's Casino MUST NOT be used with any currency that can be purchased with real money or exchanged/cashed out for real money. It is intended only for non-transferable Minecraft server-side currency with no real-money value. Running it with purchasable or redeemable currency may violate gambling, gaming, and money-transmission laws.

## Documentation

- [Roadmap](ROADMAP.md) — milestones and acceptance criteria.
- [Plan](PLAN.md) — scope, principles, and implementation constraints.
- [Architecture](ARCHITECTURE.md) — intended components and trust boundaries.
- [Payment bridge](docs/payment-bridge.md) — planned deposit/withdrawal flow and unresolved integration details.
- [Security](SECURITY.md) — security requirements for money-like balances and game outcomes.
- [Operations](OPERATIONS.md) — intended local development, deployment, and incident practices.
- [Decisions](DECISIONS.md) — decisions made and questions that remain open.
- [Status](STATUS.md) — current verified state and next work.
- [Contributing](CONTRIBUTING.md) — change and documentation practices.

## Source archive

`flipcontroller-template-26.3.zip` is an upstream Fabric mod starter template, not an implementation of the payment bridge. Its current metadata names the mod `FlipController`; it targets Minecraft 26.3, Java 25, Fabric Loader 0.19.5, Fabric API 0.162.0+26.3, and Loom 1.18-SNAPSHOT. Treat these as archive contents, not validated project requirements. Review the template's license and replace sample metadata before distributing a derivative. The archive's README describes its template as CC0; that does not establish the license for this project.

## Run the local demo

The API needs Node.js and the `sqlite3` CLI. Start it in one terminal, then start the Vite UI in another:

```sh
cd web
npm install
npm run server
```

```sh
cd web
npm run dev
```

See [web/README.md](web/README.md) for the demo limits and build command. Never use its local seed balance as real currency.
