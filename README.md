# WineLab Web Admin

## Production deploy

Production deployment is handled by:

- `install.sh`
- `deploy/install-server.sh`
- `deploy/docker-compose.prod.yml`
- `deploy/Caddyfile`
- `deploy/wl`

The server install script:

- creates `/home/prsta/winelab_web_admin`
- copies a clean project version without local build artifacts and local env files
- installs Docker and Docker Compose if missing
- installs Caddy and binds it to `lkwl.prsta.xyz`
- enables automatic TLS through Caddy
- installs the short management command `wl`
- deploys the stack without loading test data

Run on the server from the repository root:

```bash
chmod +x install.sh
sudo ./install.sh
```

After installation:

```bash
wl deploy
wl status
wl logs
wl update
```

The public webhook endpoint for Yandex Delivery is:

```text
https://lkwl.prsta.xyz/api/deliveries/provider/yandex/webhook
```

If the Yandex token or Yandex Maps key was not passed during installation, edit:

- `/home/prsta/winelab_web_admin/deploy/env/api.env`
- `/home/prsta/winelab_web_admin/deploy/env/web.env`
- `/home/prsta/winelab_web_admin/deploy/env/compose.env`

and run:

```bash
wl deploy
```

`wl update` pulls the latest code from git, rebuilds the frontend and backend images, applies Prisma migrations and restarts the stack. New npm packages and backend dependencies are installed automatically during the image rebuild because both images are rebuilt from the updated `package-lock.json` files.

## Local development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd winelab_api
npm install
npm run start:dev
```

## Encoding rule

All source files and configs in this repository must be saved as `UTF-8` without BOM.

- Any broken UTF-8 text, latin/cyrillic mojibake sequences, or Unicode replacement characters is forbidden in committed code.
- Before finishing text-heavy UI or API changes, run `npm run lint:encoding` from the repository root.
- If the check fails, the broken file must be recreated or re-saved in valid `UTF-8` before any further edits.
