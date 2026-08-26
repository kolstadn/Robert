"""
Background job runner that drives GOD'S EYE's engagement engine for the web UI.
"""

import asyncio
import json
import os
import sys
import threading
import time
import uuid

GODSEYE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "godseye")
if GODSEYE_DIR not in sys.path:
    sys.path.insert(0, GODSEYE_DIR)

REPORTS_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "reports")
AUDIT_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "audit.log.jsonl")

os.makedirs(REPORTS_ROOT, exist_ok=True)

# Only one scan runs at a time -- these engagements are noisy/heavy and this
# is a small private deployment, not a scanning service.
_scan_lock = threading.Lock()

_jobs = {}
_jobs_guard = threading.Lock()


def _audit(event: dict):
    event["ts"] = time.time()
    os.makedirs(os.path.dirname(AUDIT_LOG), exist_ok=True)
    with open(AUDIT_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")


def create_job(*, username: str, target: str, mode: str, stealth: bool,
               subdomains: bool, dirbrute: bool, ai: bool) -> str:
    job_id = uuid.uuid4().hex[:12]
    with _jobs_guard:
        _jobs[job_id] = {
            "id": job_id,
            "username": username,
            "target": target,
            "mode": mode,
            "status": "queued",
            "created": time.time(),
            "error": None,
            "counts": None,
            "risk": None,
            "report_html": None,
        }
    _audit({"event": "scan_requested", "job_id": job_id, "user": username,
            "target": target, "mode": mode})

    thread = threading.Thread(target=_run_job, args=(job_id, target, mode, stealth,
                                                       subdomains, dirbrute, ai),
                               daemon=True)
    thread.start()
    return job_id


def get_job(job_id: str):
    with _jobs_guard:
        return dict(_jobs[job_id]) if job_id in _jobs else None


def list_jobs(username: str = None):
    with _jobs_guard:
        jobs = list(_jobs.values())
    if username is not None:
        jobs = [j for j in jobs if j["username"] == username]
    return sorted(jobs, key=lambda j: j["created"], reverse=True)


def _set(job_id: str, **fields):
    with _jobs_guard:
        if job_id in _jobs:
            _jobs[job_id].update(fields)


def _run_job(job_id, target, mode, stealth, subdomains, dirbrute, ai):
    acquired = _scan_lock.acquire(timeout=1)
    if not acquired:
        _set(job_id, status="queued")
        _scan_lock.acquire()  # block until the current scan finishes
    try:
        _set(job_id, status="running")
        from main import run_engagement  # imported lazily so sys.path is set first

        output_dir = os.path.join(REPORTS_ROOT, job_id)
        api_key = os.environ.get("ANTHROPIC_API_KEY") if ai else None

        state, paths = asyncio.run(run_engagement(
            target=target,
            mode=mode,
            api_key=api_key,
            output_dir=output_dir,
            enable_ai=bool(ai and api_key),
            stealth=stealth,
            enable_subdomains=subdomains,
            enable_screenshots=False,
            enable_dirbrute=dirbrute,
        ))

        counts = state.finding_counts()
        if counts.get("critical", 0) > 0:
            risk = "CRITICAL"
        elif counts.get("high", 0) > 0:
            risk = "HIGH"
        elif counts.get("medium", 0) > 0:
            risk = "MEDIUM"
        elif counts.get("low", 0) > 0:
            risk = "LOW"
        else:
            risk = "INFO" if counts.get("info", 0) > 0 else "NONE"

        _set(job_id, status="done", counts=counts, risk=risk,
             report_html=paths.get("html"), report_json=paths.get("json"))
        _audit({"event": "scan_complete", "job_id": job_id, "target": target, "risk": risk})
    except Exception as e:
        _set(job_id, status="error", error=str(e))
        _audit({"event": "scan_error", "job_id": job_id, "target": target, "error": str(e)})
    finally:
        _scan_lock.release()
