import os, threading, sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import app

app.init_db()

# Run Flask on port 5000 in background thread, and port 5010 on main thread (or vice versa)
def run_5010():
    try:
        app.app.run(host="0.0.0.0", port=5010, threaded=True, debug=False)
    except Exception as e:
        print("Port 5010 error:", e)

t = threading.Thread(target=run_5010, daemon=True)
t.start()
print("Started server listener on port 5010")

print("Starting server listener on port 5000 (primary)...")
app.app.run(host="0.0.0.0", port=5000, threaded=True, debug=False)
