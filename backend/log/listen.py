import sys
import subprocess

# Flask가 없으면 자동 설치
try:
    from flask import Flask, request
except ImportError:
    print("Flask가 설치되어 있지 않습니다. 설치 중...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask"])
    from flask import Flask, request

app = Flask(__name__)

@app.route("/logwrite/", methods=["GET"])
def logwrite():
    writedata = request.args.get("writedata", "")

    # 요청이 들어올 때마다 한 줄씩 출력
    print(writedata, flush=True)

    return "OK"

if __name__ == "__main__":
    print("======================================")
    print(" Log Server Started")
    print(" URL : http://localhost:6766/logwrite/")
    print("======================================")
    app.run(host="0.0.0.0", port=6766)