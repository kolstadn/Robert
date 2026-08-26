"""
GOD'S EYE Web -- a private, authenticated HTTP front-end for the GOD'S EYE
security scanner.

This is NOT a public scanning service. Every account must be explicitly
provisioned by the operator (see README), and every scan requires the
requester to attest they are authorized to test the target. Do not expose
this deployment without authentication in front of it.
"""

import hmac
import os
import secrets
import time
from functools import wraps

from flask import (Flask, abort, flash, redirect, render_template, request,
                    send_file, session, url_for)

import scanner

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FORCE_HTTPS", "1") != "0"

VALID_MODES = ("pentest", "redteam")

# ---------------------------------------------------------------------------
# Auth: single/small set of accounts defined via environment variables.
#   GODSEYE_USERS="alice:correct horse battery staple,bob:another passphrase"
# Falls back to GODSEYE_USERNAME / GODSEYE_PASSWORD for a single account.
# ---------------------------------------------------------------------------

def _load_users():
    users = {}
    bulk = os.environ.get("GODSEYE_USERS", "")
    for pair in bulk.split(","):
        pair = pair.strip()
        if not pair or ":" not in pair:
            continue
        name, pw = pair.split(":", 1)
        if name.strip():
            users[name.strip()] = pw
    single_user = os.environ.get("GODSEYE_USERNAME")
    single_pass = os.environ.get("GODSEYE_PASSWORD")
    if single_user and single_pass:
        users[single_user] = single_pass
    return users


_USERS = _load_users()

# naive brute-force throttle: ip -> (fail_count, locked_until)
_login_attempts = {}
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60


def _client_ip():
    return request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()


def _is_locked_out(ip):
    fails, locked_until = _login_attempts.get(ip, (0, 0))
    return time.time() < locked_until


def _record_failure(ip):
    fails, _ = _login_attempts.get(ip, (0, 0))
    fails += 1
    locked_until = time.time() + LOCKOUT_SECONDS if fails >= MAX_ATTEMPTS else 0
    _login_attempts[ip] = (fails, locked_until)


def _record_success(ip):
    _login_attempts.pop(ip, None)


def check_credentials(username, password):
    expected = _USERS.get(username)
    if expected is None:
        # still do a comparison to keep timing similar whether or not the user exists
        hmac.compare_digest("x" * 32, password or "")
        return False
    return hmac.compare_digest(expected, password or "")


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user"):
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def _csrf_token():
    if "_csrf" not in session:
        session["_csrf"] = secrets.token_hex(16)
    return session["_csrf"]


def _check_csrf():
    token = request.form.get("csrf_token", "")
    return token and hmac.compare_digest(token, session.get("_csrf", ""))


app.jinja_env.globals["csrf_token"] = _csrf_token


@app.route("/login", methods=["GET", "POST"])
def login():
    if not _USERS:
        return render_template(
            "error.html",
            message="No accounts are configured. Set GODSEYE_USERNAME / GODSEYE_PASSWORD "
                    "(or GODSEYE_USERS) before starting this app.",
        ), 500

    if request.method == "POST":
        ip = _client_ip()
        if _is_locked_out(ip):
            flash("Too many failed attempts. Try again later.", "error")
            return render_template("login.html"), 429

        if not _check_csrf():
            abort(400)

        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if check_credentials(username, password):
            _record_success(ip)
            session.clear()
            session["user"] = username
            next_url = request.args.get("next") or url_for("dashboard")
            return redirect(next_url)

        _record_failure(ip)
        flash("Invalid username or password.", "error")

    return render_template("login.html")


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
@login_required
def dashboard():
    jobs = scanner.list_jobs(username=session["user"])
    return render_template("dashboard.html", jobs=jobs)


@app.route("/scan", methods=["GET", "POST"])
@login_required
def new_scan():
    ai_available = bool(os.environ.get("ANTHROPIC_API_KEY"))

    if request.method == "POST":
        if not _check_csrf():
            abort(400)

        target = request.form.get("target", "").strip()
        mode = request.form.get("mode", "pentest")
        stealth = request.form.get("stealth") == "on"
        subdomains = request.form.get("subdomains") == "on"
        dirbrute = request.form.get("dirbrute") == "on"
        ai = ai_available and request.form.get("ai") == "on"
        authorized = request.form.get("authorized") == "on"

        errors = []
        if not target:
            errors.append("Target is required.")
        if mode not in VALID_MODES:
            errors.append("Invalid mode.")
        if not authorized:
            errors.append(
                "You must confirm you own this target or have explicit written "
                "authorization to test it."
            )

        if errors:
            for e in errors:
                flash(e, "error")
            return render_template("scan_form.html", ai_available=ai_available,
                                    form=request.form)

        job_id = scanner.create_job(
            username=session["user"], target=target, mode=mode, stealth=stealth,
            subdomains=subdomains, dirbrute=dirbrute, ai=ai,
        )
        return redirect(url_for("job_status", job_id=job_id))

    return render_template("scan_form.html", ai_available=ai_available, form={})


@app.route("/jobs/<job_id>")
@login_required
def job_status(job_id):
    job = scanner.get_job(job_id)
    if not job or job["username"] != session["user"]:
        abort(404)
    return render_template("job_status.html", job=job)


@app.route("/jobs/<job_id>/report")
@login_required
def job_report(job_id):
    job = scanner.get_job(job_id)
    if not job or job["username"] != session["user"]:
        abort(404)
    if job["status"] != "done" or not job.get("report_html"):
        abort(404)
    return send_file(job["report_html"])


@app.after_request
def set_security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    return resp


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port)
