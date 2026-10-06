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

import pyodbc
from flask import Flask, jsonify, render_template, request

from email_service import send_enquiry_confirmation

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
    return pyodbc.connect(CONN_STR)


def init_db():
    """Create tables if they don't exist (idempotent)."""
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
    with get_conn() as conn:
        conn.execute(ddl)
        conn.commit()


def new_reference(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
def index():
    return render_template("index.html")


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


if __name__ == "__main__":
    try:
        init_db()
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("DB init skipped (offline?): %s", exc)
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5010")), debug=os.getenv("FLASK_DEBUG") == "1")
