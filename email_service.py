"""
BIA — Brilliance in Apparel · Email Notification Service
Handles asynchronous email dispatch for fabric briefs, enquiries, and swatch requests.
"""
import logging
import os
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("bia.email")

# ---------------------------------------------------------------------------
# SMTP Configuration
# ---------------------------------------------------------------------------
SMTP_SERVER    = os.getenv("SMTP_SERVER", os.getenv("SMTP_HOST", ""))
SMTP_PORT      = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER      = os.getenv("SMTP_USER", "")
SMTP_PASSWORD  = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS   = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1")
BIA_FROM_EMAIL = os.getenv("BIA_FROM_EMAIL", "develop@bia.jo")
BIA_ADMIN_EMAIL = os.getenv("BIA_ADMIN_EMAIL", "develop@bia.jo")

TOPIC_LABELS = {
    "fabric": "Custom Fabric Development",
    "development": "Swatch Request & Fabric Development",
    "capacity": "Production Capacity & Mill Inquiries",
    "mill_visit": "Mill Tour / Facility Visit",
    "supplier": "Partnership & Supplier Relations",
    "careers": "Careers & Talent",
    "general": "General Inquiry",
}


def send_email_async(to_email: str, subject: str, body_text: str, body_html: str = ""):
    """Send an email asynchronously in a background thread to prevent latency on requests."""
    def _worker():
        if not SMTP_SERVER:
            logger.info(
                "[EMAIL LOG (DEV/OFFLINE)] To: %s | Subject: %s\n%s",
                to_email,
                subject,
                body_text,
            )
            return
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = BIA_FROM_EMAIL
            msg["To"] = to_email

            part1 = MIMEText(body_text, "plain", "utf-8")
            msg.attach(part1)
            if body_html:
                part2 = MIMEText(body_html, "html", "utf-8")
                msg.attach(part2)

            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
                if SMTP_USE_TLS:
                    server.starttls()
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(BIA_FROM_EMAIL, [to_email], msg.as_string())
            logger.info("[EMAIL SENT] Successfully sent email to %s | Subject: %s", to_email, subject)
        except Exception as err:
            logger.error("[EMAIL ERROR] Failed to send email to %s: %s", to_email, err)

    threading.Thread(target=_worker, daemon=True).start()


def send_enquiry_confirmation(ref: str, topic: str, name: str, email: str, company: str = None, message: str = None):
    """
    Formats and dispatches confirmation email for enquiries & custom fabric development.
    Dispatches to both the client and the internal BIA engineering inbox.
    """
    topic_title = TOPIC_LABELS.get(topic, "Fabric & Mill Inquiry")
    subject = f"Enquiry Received [{ref}] — BIA Textile Mill Jordan"

    text_content = f"""Dear {name},

Thank you for contacting BIA (Brilliance in Apparel).

We have received your enquiry regarding {topic_title}. Your reference number is: {ref}.

Enquiry Summary:
----------------
Reference: {ref}
Enquiry Type: {topic_title}
Name: {name}
Company: {company or 'N/A'}
Email: {email}

Details:
{message or 'None provided'}

Next Steps:
A dedicated fabric engineer or sales representative from our Amman facility has been assigned to your request and will review your specifications within 24–48 hours.

If you have urgent requirements, you can also reach our direct mill line at +962 6 402 0000.

Sincerely,
The BIA Engineering & Client Team
Al-Tajamouat Industrial City, Sahab, Amman, Jordan
https://bia.jo
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0c090c; color: #f4f1ec; margin: 0; padding: 30px 15px; }}
    .container {{ max-width: 580px; margin: 0 auto; background: #181317; border: 1px solid #3a151f; border-radius: 12px; padding: 32px; }}
    .logo {{ font-size: 24px; font-weight: 900; letter-spacing: 0.15em; color: #c8102e; text-transform: uppercase; margin-bottom: 24px; }}
    h2 {{ font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; }}
    p {{ color: #a49f99; font-size: 14.5px; line-height: 1.6; }}
    .ref-box {{ background: #231218; border: 1px solid #c8102e; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }}
    .ref-label {{ font-size: 11px; letter-spacing: 0.15em; color: #a49f99; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px; }}
    .ref-val {{ font-size: 22px; font-weight: 800; color: #ff3355; letter-spacing: 0.1em; }}
    .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
    .details-table td {{ padding: 8px 0; font-size: 13.5px; border-bottom: 1px solid #2a2228; }}
    .details-table td.label {{ color: #a49f99; width: 35%; font-weight: 600; }}
    .details-table td.val {{ color: #f4f1ec; }}
    .msg-block {{ background: #100d10; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #ddd; white-space: pre-line; border-left: 3px solid #c8102e; }}
    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #2a2228; font-size: 12px; color: #6d6662; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">BIA</div>
    <h2>Enquiry Confirmation</h2>
    <p>Dear <strong>{name}</strong>,</p>
    <p>Thank you for reaching out to BIA. Your request has been logged and assigned to our fabric engineering division.</p>
    
    <div class="ref-box">
      <span class="ref-label">Reference Number</span>
      <span class="ref-val">{ref}</span>
    </div>

    <table class="details-table">
      <tr><td class="label">Enquiry Type:</td><td class="val">{topic_title}</td></tr>
      <tr><td class="label">Company:</td><td class="val">{company or '—'}</td></tr>
      <tr><td class="label">Email:</td><td class="val">{email}</td></tr>
    </table>

    <p style="margin-bottom: 8px; font-weight: 600; color: #f4f1ec;">Submitted Specifications / Message:</p>
    <div class="msg-block">{message or 'General inquiry submitted.'}</div>

    <p style="margin-top: 24px;">Our engineering team will review your specifications and get in touch within 24–48 hours.</p>

    <div class="footer">
      <strong>BIA — Brilliance in Apparel</strong><br />
      Al-Tajamouat Industrial City, Sahab · Amman, Jordan<br />
      Direct Mill Line: +962 6 402 0000 · <a href="mailto:develop@bia.jo" style="color: #c8102e; text-decoration: none;">develop@bia.jo</a>
    </div>
  </div>
</body>
</html>
"""

    # Dispatch to customer
    send_email_async(email, subject, text_content, html_content)

    # Dispatch copy to internal team
    if BIA_ADMIN_EMAIL and BIA_ADMIN_EMAIL != email:
        admin_subject = f"[NEW INQUIRY] {topic_title} from {name} ({company or 'No Company'}) [{ref}]"
        send_email_async(BIA_ADMIN_EMAIL, admin_subject, text_content, html_content)
