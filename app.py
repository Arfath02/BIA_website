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
        return jsonify({"status": "degraded", "db": str(exc)[:200]}), 503


@app.post("/api/fabric-brief")
def fabric_brief():
    data = request.get_json(silent=True) or {}
    feel = data.get("feel")
    perf = data.get("performance")
    appl = data.get("application")

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
    data = request.get_json(silent=True) or {}
    topic   = data.get("topic", "general")
    name    = (data.get("name") or "").strip()
    email   = (data.get("email") or "").strip()
    company = (data.get("company") or "").strip() or None
    message = (data.get("message") or "").strip() or None

    if topic not in ALLOWED_TOPIC:
        return jsonify({"error": "Invalid topic."}), 400
    if not name:
        return jsonify({"error": "Name is required."}), 400
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
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    company = (data.get("company") or "").strip() or None
    application = data.get("application") or "High-Performance Sportswear"
    performance = data.get("performance") or []
    composition = data.get("composition") or "Engineering Recommendation"
    gsm = data.get("gsm") or "Custom Spec"
    target_price = data.get("target_price") or "FOB Benchmark"
    volume = data.get("volume") or "Production Program"
    timeline = data.get("timeline") or "Upcoming Season"
    notes = data.get("notes") or ""

    if not name:
        return jsonify({"error": "Name is required."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "A valid work email is required."}), 400

    ref = new_reference("BIA-NXT")
    perf_str = ", ".join(performance) if isinstance(performance, list) else str(performance)
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
