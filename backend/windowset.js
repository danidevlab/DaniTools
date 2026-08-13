const fs = require('fs');
const path = require('path');

// 필요한 패키지 확인 및 설치
function ensureDependencies() {
    const requiredPackages = ['express'];
    const { execSync } = require('child_process');

    requiredPackages.forEach(pkg => {
        try {
            require.resolve(pkg);
        } catch (e) {
            console.log(`📦 Installing missing package: ${pkg}...`);
            try {
                execSync(`npm install ${pkg}`, { stdio: 'inherit', cwd: __dirname });
                console.log(`✅ ${pkg} installed successfully`);
            } catch (error) {
                console.error(`❌ Failed to install ${pkg}:`, error.message);
                process.exit(1);
            }
        }
    });
}

// 서버 시작 전 의존성 확인
ensureDependencies();

const express = require('express');
const app = express();
const PORT = 4047;

// 창 데이터를 저장할 파일 경로
const WINDOW_DATA_FILE = path.join(__dirname, 'windowdata.json');

// 메모리에 현재 창 상태 저장
let windowsData = [];

// 시작시 저장된 데이터 로드
function loadWindowData() {
    try {
        if (fs.existsSync(WINDOW_DATA_FILE)) {
            const data = fs.readFileSync(WINDOW_DATA_FILE, 'utf8');
            windowsData = JSON.parse(data) || [];
        } else {
            windowsData = [];
        }
    } catch (error) {
        console.error('Failed to load window data:', error);
        windowsData = [];
    }
}

// 창 데이터를 파일에 저장
function saveWindowDataToFile() {
    try {
        fs.writeFileSync(WINDOW_DATA_FILE, JSON.stringify(windowsData, null, 2), 'utf8');
    } catch (error) {
        console.error('Failed to save window data to file:', error);
    }
}

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 활성화
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// 창 데이터 저장 엔드포인트
app.get('/savewindowdata/', (req, res) => {
    try {
        const windowdata = req.query.windowdata;
        
        if (!windowdata) {
            return res.status(400).json({ error: 'windowdata query parameter is required' });
        }

        const parsedData = JSON.parse(decodeURIComponent(windowdata));

        // 제거 요청인 경우
        if (parsedData.action === 'remove') {
            windowsData = windowsData.filter(w => w.title !== parsedData.title);
        } else if (parsedData.title) {
            // 기존 데이터 제거 후 새 데이터 추가 (업데이트)
            windowsData = windowsData.filter(w => w.title !== parsedData.title);
            windowsData.push(parsedData);
        }

        saveWindowDataToFile();
        res.json({ success: true, message: 'Window data saved' });
    } catch (error) {
        console.error('Error saving window data:', error);
        res.status(500).json({ error: 'Failed to save window data', details: error.message });
    }
});

// 창 데이터 조회 엔드포인트
app.get('/getwindowdata/', (req, res) => {
    try {
        res.json(windowsData);
    } catch (error) {
        console.error('Error retrieving window data:', error);
        res.status(500).json({ error: 'Failed to retrieve window data', details: error.message });
    }
});

// 모든 창 데이터 삭제
app.post('/clearwindowdata/', (req, res) => {
    try {
        windowsData = [];
        saveWindowDataToFile();
        res.json({ success: true, message: 'All window data cleared' });
    } catch (error) {
        console.error('Error clearing window data:', error);
        res.status(500).json({ error: 'Failed to clear window data', details: error.message });
    }
});

function windows_save_restore() {
    loadWindowData();
    
    app.listen(PORT, () => {
        console.log(`Window data server running on http://localhost:${PORT}`);
        console.log(`POST: http://localhost:${PORT}/savewindowdata/?windowdata=<data>`);
        console.log(`GET: http://localhost:${PORT}/getwindowdata/`);
    });
}

// 서버 시작
windows_save_restore();
