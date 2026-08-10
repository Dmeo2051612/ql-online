from flask import Flask, render_template


app = Flask(__name__)


@app.route("/")
def trang_chu():
    return render_template(
        "login.html"
    )


@app.route("/admin")
def trang_admin():
    return render_template(
        "admin.html"
    )


@app.route("/sinh-vien")
def trang_sinh_vien():
    return render_template(
        "sinh_vien.html"
    )


@app.route("/giao-vien")
def trang_giao_vien():
    return render_template(
        "giao_vien.html"
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )