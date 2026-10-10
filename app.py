"""
BIA — Brilliance in Apparel · website backend
Flask + Microsoft SQL Server (pyodbc).

Endpoints
---------
GET  /                     -> homepage
POST /api/fabric-brief     -> "Make Your Fabric" development brief (lead)
POST /api/enquiry          -> general enquiry (contact page, swatch, mill visit, careers)
GET  /api/health           -> db connectivity check

Run:
    pip install -r requirements.txt
    set the env vars below, then:  python app.py
"""
import os
import re
import uuid
from datetime import datetime, timezone

import sys
import threading
import time
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

try:
    import pyodbc
    PYODBC_AVAILABLE = True
except ImportError:
    pyodbc = None
    PYODBC_AVAILABLE = False

from flask import Flask, jsonify, render_template, request

try:
    from email_service import send_enquiry_confirmation
except ImportError:
    def send_enquiry_confirmation(*args, **kwargs):
        pass

app = Flask(__name__)
# 2MB max payload to mitigate memory exhaustion DoS
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024

# ---------------------------------------------------------------------------
# In-Memory Rate Limiter (Thread-safe sliding window)
# ---------------------------------------------------------------------------
_RATE_LIMIT_STORE = defaultdict(list)
_RATE_LIMIT_LOCK = threading.Lock()


def is_rate_limited(ip: str, limit: int = 15, window_seconds: int = 60) -> bool:
    """Thread-safe sliding window rate limiter per client IP."""
    now = time.time()
    with _RATE_LIMIT_LOCK:
        timestamps = _RATE_LIMIT_STORE[ip]
        valid = [t for t in timestamps if now - t < window_seconds]
        if len(valid) >= limit:
            _RATE_LIMIT_STORE[ip] = valid
            return True
        valid.append(now)
        _RATE_LIMIT_STORE[ip] = valid
        return False


def get_client_ip() -> str:
    """Safely extract remote IP handling proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"


# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
@app.after_request
def apply_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: https: blob:; "
        "connect-src 'self'; "
        "frame-ancestors 'self';"
    )
    if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "Payload exceeds maximum allowed size (2MB)."}), 413


# ---------------------------------------------------------------------------
# Configuration (environment variables)
# ---------------------------------------------------------------------------
SQL_SERVER   = os.getenv("BIA_SQL_SERVER",   "localhost")
SQL_DATABASE = os.getenv("BIA_SQL_DATABASE", "bia_website")
SQL_USER     = os.getenv("BIA_SQL_USER",     "bia_app")
SQL_PASSWORD = os.getenv("BIA_SQL_PASSWORD", "change-me")
SQL_DRIVER   = os.getenv("BIA_SQL_DRIVER",   "ODBC Driver 18 for SQL Server")

CONN_STR = (
    f"DRIVER={{{SQL_DRIVER}}};"
    f"SERVER={SQL_SERVER};"
    f"DATABASE={SQL_DATABASE};"
    f"UID={SQL_USER};PWD={SQL_PASSWORD};"
    "Encrypt=yes;TrustServerCertificate=yes;Connection Timeout=5;"
)

ALLOWED_FEEL  = {"Soft", "Structured", "Lightweight"}
ALLOWED_PERF  = {"Cool", "Wick", "Stretch", "Protect", "Insulate"}
ALLOWED_APP   = {"Running", "Training", "Lifestyle", "Outdoor", "Workwear"}
ALLOWED_TOPIC = {"fabric", "development", "capacity", "mill_visit", "supplier", "careers", "general"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_conn():
    if not PYODBC_AVAILABLE:
        raise RuntimeError("pyodbc is not installed or available on this platform.")
    return pyodbc.connect(CONN_STR)


def init_db():
    """Create tables if they don't exist (idempotent)."""
    if not PYODBC_AVAILABLE or os.getenv("BIA_ENABLE_DB") != "1":
        return
    ddl = """
    IF OBJECT_ID('dbo.fabric_briefs', 'U') IS NULL
    CREATE TABLE dbo.fabric_briefs (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        reference     NVARCHAR(20)  NOT NULL UNIQUE,
        feel          NVARCHAR(40)  NOT NULL,
        performance   NVARCHAR(40)  NOT NULL,
        application   NVARCHAR(40)  NOT NULL,
        status        NVARCHAR(20)  NOT NULL DEFAULT 'new',
        created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );

    IF OBJECT_ID('dbo.enquiries', 'U') IS NULL
    CREATE TABLE dbo.enquiries (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        reference     NVARCHAR(20)  NOT NULL UNIQUE,
        topic         NVARCHAR(30)  NOT NULL,
        name          NVARCHAR(120) NOT NULL,
        email         NVARCHAR(200) NOT NULL,
        company       NVARCHAR(160) NULL,
        message       NVARCHAR(2000) NULL,
        status        NVARCHAR(20)  NOT NULL DEFAULT 'new',
        created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );
    """
    try:
        with get_conn() as conn:
            conn.execute(ddl)
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("DB init skipped: %s", exc)


def new_reference(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


# ---------------------------------------------------------------------------
# Multi-Page Routes
# ---------------------------------------------------------------------------
@app.get("/")
def index():
    return render_template("index.html")


@app.get("/story")
@app.get("/our-story")
def story():
    return render_template("story.html")


@app.get("/fabrics")
@app.get("/fabric-technologies")
@app.get("/material-library")
def fabrics():
    return render_template("fabrics.html")


@app.get("/innovation")
@app.get("/bia-next")
def innovation():
    return render_template("innovation.html")


@app.get("/inside")
@app.get("/inside-bia")
@app.get("/scale")
@app.get("/capacity")
@app.get("/quality")
@app.get("/certifications")
def inside():
    return render_template("inside.html")


@app.get("/ecosystem")
@app.get("/bia-classic")
def ecosystem():
    return render_template("ecosystem.html")


@app.get("/partners")
@app.get("/global-reach")
@app.get("/markets")
def partners():
    return render_template("index.html")


@app.get("/responsibility")
@app.get("/sustainability")
def responsibility():
    return render_template("responsibility.html")


@app.get("/people")
@app.get("/culture")
def people():
    return render_template("people.html")


@app.get("/stories")
@app.get("/insights")
@app.get("/fabric-stories")
def stories():
    return render_template("stories.html")


@app.get("/contact")
@app.get("/develop")
def contact():
    return render_template("contact.html")


@app.get("/mock")
def mock():
    return render_template("mock.html")


@app.get("/api/health")
def health():
    try:
        with get_conn() as conn:
            conn.execute("SELECT 1")
        return jsonify({"status": "ok", "db": "connected"})
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("DB connectivity check degraded: %s", exc)
        return jsonify({"status": "degraded", "db": "unavailable"}), 503


@app.post("/api/fabric-brief")
def fabric_brief():
    ip = get_client_ip()
    if is_rate_limited(ip, limit=20, window_seconds=60):
        return jsonify({"error": "Too many requests. Please wait a moment."}), 429

    data = request.get_json(silent=True) or {}
    feel = str(data.get("feel") or "").strip()
    perf = str(data.get("performance") or "").strip()
    appl = str(data.get("application") or "").strip()

    if feel not in ALLOWED_FEEL or perf not in ALLOWED_PERF or appl not in ALLOWED_APP:
        return jsonify({"error": "Invalid brief selection."}), 400

    ref = new_reference("BIA")
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO dbo.fabric_briefs (reference, feel, performance, application) VALUES (?, ?, ?, ?)",
                (ref, feel, perf, appl),
            )
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("DB insert failed (offline?): %s", exc)

    return jsonify({"reference": ref, "received_at": datetime.now(timezone.utc).isoformat()}), 201


@app.post("/api/enquiry")
def enquiry():
    ip = get_client_ip()
    if is_rate_limited(ip, limit=10, window_seconds=60):
        return jsonify({"error": "Too many requests. Please wait a moment."}), 429

    data = request.get_json(silent=True) or {}
    topic   = str(data.get("topic") or "general").strip()
    name    = str(data.get("name") or "").strip()[:120]
    email   = str(data.get("email") or "").strip()[:200]
    company = str(data.get("company") or "").strip()[:160] or None
    message = str(data.get("message") or "").strip()[:3000] or None

    if topic not in ALLOWED_TOPIC:
        return jsonify({"error": "Invalid topic."}), 400
    if not name or len(name) < 2:
        return jsonify({"error": "A valid name is required."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "A valid email is required."}), 400

    ref = new_reference("ENQ")
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO dbo.enquiries (reference, topic, name, email, company, message) VALUES (?, ?, ?, ?, ?, ?)",
                (ref, topic, name, email, company, message),
            )
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("DB insert failed (offline?): %s", exc)

    # Dispatch confirmation email via separate email service
    send_enquiry_confirmation(
        ref=ref,
        topic=topic,
        name=name,
        email=email,
        company=company,
        message=message,
    )

    return jsonify({"reference": ref, "status": "success", "email_dispatched": True}), 201


@app.post("/api/fabric-challenge")
def fabric_challenge():
    ip = get_client_ip()
    if is_rate_limited(ip, limit=10, window_seconds=60):
        return jsonify({"error": "Too many requests. Please wait a moment."}), 429

    data = request.get_json(silent=True) or {}
    name = str(data.get("name") or "").strip()[:120]
    email = str(data.get("email") or "").strip()[:200]
    company = str(data.get("company") or "").strip()[:160] or None
    application = str(data.get("application") or "High-Performance Sportswear")[:100]
    raw_perf = data.get("performance") or []
    if isinstance(raw_perf, list):
        performance = [str(p)[:40] for p in raw_perf[:10]]
    else:
        performance = [str(raw_perf)[:40]]
    composition = str(data.get("composition") or "Engineering Recommendation")[:100]
    gsm = str(data.get("gsm") or "Custom Spec")[:50]
    target_price = str(data.get("target_price") or "FOB Benchmark")[:50]
    volume = str(data.get("volume") or "Production Program")[:50]
    timeline = str(data.get("timeline") or "Upcoming Season")[:50]
    notes = str(data.get("notes") or "").strip()[:2000]

    if not name or len(name) < 2:
        return jsonify({"error": "A valid contact name is required."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "A valid work email is required."}), 400

    ref = new_reference("BIA-NXT")
    perf_str = ", ".join(performance)
    formatted_msg = (
        f"[BIA NEXT CHALLENGE]\n"
        f"• Application: {application}\n"
        f"• Desired Performance: {perf_str}\n"
        f"• Target Composition: {composition}\n"
        f"• Target Weight: {gsm}\n"
        f"• Target Price: {target_price}\n"
        f"• Order Volume: {volume}\n"
        f"• Development Timeline: {timeline}\n"
        f"• Additional Requirements: {notes}"
    )
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO dbo.enquiries (reference, topic, name, email, company, message) VALUES (?, ?, ?, ?, ?, ?)",
                (ref, "development", name, email, company, formatted_msg),
            )
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("DB insert failed (offline?): %s", exc)

    send_enquiry_confirmation(
        ref=ref,
        topic="development",
        name=name,
        email=email,
        company=company,
        message=formatted_msg,
    )

    return jsonify({
        "reference": ref,
        "status": "success",
        "received_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "application": application,
            "performance": performance,
            "composition": composition,
            "gsm": gsm,
            "target_price": target_price,
            "volume": volume,
            "timeline": timeline,
            "company": company or "Confidential Brand"
        }
    }), 201


if __name__ == "__main__":
    try:
        init_db()
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("DB init skipped (offline?): %s", exc)
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")
