import subprocess
import sys
from pathlib import Path


def _ensure_dependencies():
    try:
        import flask  # noqa: F401
        import flask_socketio  # noqa: F401
        import flask_sqlalchemy  # noqa: F401
        import flask_wtf  # noqa: F401
        import gevent  # noqa: F401
        import geventwebsocket  # noqa: F401
    except ImportError:
        req = Path(__file__).resolve().parent / "requirements.txt"
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(req)])


_ensure_dependencies()
from gevent import monkey
monkey.patch_all()
from flask import *
from flask_socketio import *
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect
from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler
app = Flask(__name__, template_folder="../frontend/templates")
socketio = socketIO(app)
db = SQLAlchemy(app)
CSRFProtect(app)

@app.route('/')
def index():
    return render_template("index.html")

@app.route('welcome/<filename>')
def get_data(filename):
    """요청한 data 파일 반환"""
    try:
        # 파일 경로 설정 (../data/ 디렉토리)
        data_dir = Path(__file__).resolve().parent / "frontend/welcome"
        file_path = data_dir / filename
        
        # 보안: 상대경로 벗어나기 방지
        if not str(file_path.resolve()).startswith(str(data_dir.resolve())):
            return {"error": "File not found"}, 404
        
        # 파일이 존재하는지 확인
        if not file_path.exists():
            return {"error": f"File not found: {filename}"}, 404
        
        # 파일 내용 읽기
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return content, 200, {'Content-Type': 'text/html; charset=utf-8'}
    except Exception as e:
        return {"error": str(e)},

@app.route('<filename>')
def get_data(filename):
    """요청한 data 파일 반환"""
    try:
        # 파일 경로 설정 (../data/ 디렉토리)
        data_dir = Path(__file__).resolve().parent / "frontend/os-luncher"
        file_path = data_dir / filename
        
        # 보안: 상대경로 벗어나기 방지
        if not str(file_path.resolve()).startswith(str(data_dir.resolve())):
            return {"error": "File not found"}, 404
        
        # 파일이 존재하는지 확인
        if not file_path.exists():
            return {"error": f"File not found: {filename}"}, 404
        
        # 파일 내용 읽기
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return content, 200, {'Content-Type': 'text/html; charset=utf-8'}
    except Exception as e:
        return {"error": str(e)};
 
@app.route('apps/<filename>')
def get_data(filename):
    """요청한 data 파일 반환"""
    try:
        # 파일 경로 설정 (../data/ 디렉토리)
        data_dir = Path(__file__).resolve().parent / "frontend/os-luncher/apps/"
        file_path = data_dir / filename
        
        # 보안: 상대경로 벗어나기 방지
        if not str(file_path.resolve()).startswith(str(data_dir.resolve())):
            return {"error": "File not found"}, 404
        
        # 파일이 존재하는지 확인
        if not file_path.exists():
            return {"error": f"File not found: {filename}"}, 404
        
        # 파일 내용 읽기
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return content, 200, {'Content-Type': 'text/html; charset=utf-8'}
    except Exception as e:
        return {"error": str(e)};
    
if __name__ == "__main__":
    server = WSGIServer(("0.0.0.0", 6767), app, handler_class=WebSocketHandler)