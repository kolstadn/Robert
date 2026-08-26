# Robert

## GOD'S EYE Web

This repo contains [GOD'S EYE](godseye/README.md), a CLI web-security scanner
(fingerprinting, port scanning, CVE correlation, default-credential checks,
etc.), plus a small Flask front-end (`webapp/`) that puts it behind HTTP so it
can be run and checked from a browser, including on mobile.

**This is a private, authenticated tool, not a public scanning service.**
Every account is provisioned by whoever runs the deployment, and every scan
requires the requester to attest they own or are authorized to test the
target — see [`godseye/DISCLAIMER.md`](godseye/DISCLAIMER.md). Do not expose
a deployment without authentication, and do not add open/unauthenticated
signup.

### Running locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # then edit .env with real values
export $(grep -v '^#' .env | xargs)   # or use a tool like direnv/python-dotenv

cd webapp
python app.py          # serves on http://0.0.0.0:8000
```

Log in with the `GODSEYE_USERNAME` / `GODSEYE_PASSWORD` (or `GODSEYE_USERS`)
you set, then use "New scan" to run an engagement and view its HTML report.

### Deploying so it's reachable over the internet

The app is a standard WSGI Flask app (`webapp/app.py:app`) with a `Procfile`
for platforms that use one (Render, Railway, Fly.io, etc.):

```
web: gunicorn --chdir webapp --workers 2 --threads 4 --timeout 300 --bind 0.0.0.0:$PORT app:app
```

Whichever host you use:

1. Set `GODSEYE_USERNAME`/`GODSEYE_PASSWORD` (or `GODSEYE_USERS`) and a random
   `FLASK_SECRET_KEY` as platform secrets/environment variables — never commit
   real credentials.
2. Put it behind HTTPS (most PaaS options do this automatically; on a raw VM,
   put Caddy or nginx + Let's Encrypt in front of it). `FORCE_HTTPS=1`
   (the default) makes the session cookie `Secure`, so login won't work over
   plain HTTP.
3. Only share the URL/credentials with people you've actually authorized to
   run scans through it.

Scans run one at a time in a background thread and can take a few minutes;
the job status page auto-refreshes until the report is ready.
