# car-service

Personal car maintenance tracker. This public repository holds code only.
All vehicle data lives in a separate private repository.

- `web/`: static app on GitHub Pages. `web/core/` is the shared schedule logic.
  Thai and English: Thai is the source text, `web/core/lang/en.js` holds English keyed by the Thai text.
  The language is chosen in Settings and saved as `car.language` in the data, so Discord follows it too.
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

`setup-env.sh` also asks for `DATA_OWNER` and `DATA_REPO` (the data repository), which the bot now requires.

The same code is published for others as the template `tipokkitkobsin/car-service-template`.
Keep the two in step: change code here, then copy `web/`, `notifier/`, `bot/` and `test/` to the template.

Never paste a token into a chat, an issue or a commit. `setup-env.sh` reads tokens from a hidden prompt.
