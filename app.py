import os
from flask import Flask, render_template

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from notification_api import notification_api_bp


app = Flask(__name__)
app.register_blueprint(notification_api_bp)


@app.after_request
def them_bao_mat_headers(response):
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    # Allow Firebase CDN, gstatic, and same-origin scripts
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://www.gstatic.com https://cdn.jsdelivr.net; "
        "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com "
        "https://firestore.googleapis.com https://identitytoolkit.googleapis.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self';"
    )
    return response


@app.route("/")
def trang_chu():
    return render_template("login.html")


@app.route("/admin")
def trang_admin():
    return render_template("admin.html")


@app.route("/sinh-vien")
def trang_sinh_vien():
    return render_template("sinh_vien.html")


@app.route("/giao-vien")
def trang_giao_vien():
    return render_template("giao_vien.html")


@app.get("/healthz")
def health_check():
    return {"status": "ok"}, 200


if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=debug_mode
    )
