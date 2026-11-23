# car-service

Personal car maintenance tracker. This public repository holds code only.
All vehicle data lives in a separate private repository.

- `web/`: static app on GitHub Pages. `web/core/` is the shared schedule logic.
- `notifier/`: daily reminder job, run by the private repository's GitHub Actions.
- `bot/`: Discord bot for `/km`, `/status` and the mileage button. Runs in Docker.

## Develop

```bash
npm test
```

```bash
npm run serve
```

## Run the bot on a NAS

The bot only makes outbound connections, so no port needs to be opened.

```bash
curl -L https://github.com/tipokkitkobsin/car-service/archive/refs/heads/main.tar.gz | tar xz
```

```bash
cd car-service-main/bot && bash setup-env.sh
```

```bash
sudo docker compose up -d --build
```

Never paste a token into a chat, an issue or a commit. `setup-env.sh` reads tokens from a hidden prompt.
