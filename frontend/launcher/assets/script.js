        const app_links = {
            '디데이': './apps/d-day.html',
            '타이머': './apps/timer.html',
            '주사위 던지기': './apps/dice.html',
            '랜덤 선택': './apps/random.html',
            '돌림판': './apps/circlepan.html',
            '점수판': './apps/scoreboard.html',
            '메모': './apps/memo.html',
            '소음 측정기': './apps/noise-meter.html',
            'QR 코드 생성기': './apps/qrcodemaker.html',
            '실시간 시계': './apps/livetime.html',
            '체크리스트': './apps/checklist.html',
            '설정': './apps/settings.html',
            '파일 암호화': './apps/filesecurety.html',
            'game': "./apps/game.html",
            '지구 라이브': './apps/earthlive.html',
            '플레이어': "./apps/files-viewer/index.html",
            'Plugin Manager': "./apps/pluginmanager.html"
        };

        const SEARCH_RESULTS_LIMIT = 6;
        const appNames = Object.keys(app_links);

        const APP_KEYWORDS = {
            '바코드': 'QR 코드 생성기',
            'qr코드': 'QR 코드 생성기',
            'barcode': 'QR 코드 생성기',
            '코드': 'QR 코드 생성기',
            '생성기': 'QR 코드 생성기'
        };

        function resolveKeywordApp(query) {
            const normalized = query.trim().toLowerCase();
            if (!normalized) return null;
            for (const [keyword, appName] of Object.entries(APP_KEYWORDS)) {
                if (normalized === keyword || normalized.includes(keyword)) {
                    return appName;
                }
            }
            return null;
        }

        function openAppByName(appName) {
            if (!app_links[appName]) return;
            logLauncherEvent(`launcher_search_open_${appName}`);
            createWindow(appName, app_links[appName]);
        }

        function renderSearchResults(query) {
            const normalized = query.trim().toLowerCase();
            const results = normalized
                ? appNames.filter(name => name.toLowerCase().includes(normalized)).slice(0, SEARCH_RESULTS_LIMIT)
                : [];

            const resultsContainer = document.getElementById('search-results');
            if (!results.length) {
                resultsContainer.classList.remove('visible');
                resultsContainer.innerHTML = '';
                return;
            }

            resultsContainer.innerHTML = results
                .map(name => `<button type="button" class="search-result-item">${name}</button>`)
                .join('');
            resultsContainer.classList.add('visible');

            resultsContainer.querySelectorAll('.search-result-item').forEach(button => {
                button.addEventListener('click', () => {
                    openAppByName(button.textContent);
                    const searchInput = document.getElementById('app-search-input');
                    searchInput.value = '';
                    renderSearchResults('');
                });
            });
        }

        alert("현재 DaniTools는 베타 버전입니다. 일부 기능이 정상적으로 동작하지 않을 수 있습니다. ");

        function updateClock() {
        const now = new Date();

        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");

        let h = now.getHours();
        const min = String(now.getMinutes()).padStart(2, "0");

        const ampm = h >= 12 ? "오후" : "오전";
        h = h % 12 || 12;

        document.getElementById("livetime").innerHTML =
            `${y}-${m}-${d}<br>${ampm} ${h}:${min}`;
    }

        updateClock();
        setInterval(updateClock, 1000);

        const desktop = document.getElementById("desktop");
        const imageUrl = './bgimg.png';
        // const imageUrl = 'http://localhost:6678/backgroundimage.jpg';
        document.body.style.backgroundImage = `url(${imageUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';

        const STORAGE_KEY = '_daniTools_windows';
        let zIndexCounter = 100;

        function logLauncherEvent(message) {
            const timestamp = new Date().toISOString();
            fetch(`http://localhost:6766/logwrite/?writedata=${encodeURIComponent(`[${timestamp}] ${message}`)}`);
        }

        function getCachedWindows() {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            try {
                return JSON.parse(raw) || [];
            } catch (error) {
                console.warn('Failed to parse window cache:', error);
                return [];
            }
        }

        function setCachedWindows(windows) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
            } catch (error) {
                console.warn('Failed to save window cache:', error);
            }
        }

        function saveWindowState(state) {
            const windows = getCachedWindows().filter(w => w.title !== state.title);
            windows.push(state);
            setCachedWindows(windows);
        }

        function removeWindowState(title) {
            const windows = getCachedWindows().filter(w => w.title !== title);
            setCachedWindows(windows);
        }

        function syncTaskbarRunningState(title) {
            const taskbarButton = document.querySelector(`.taskbar-app[title="${title}"]`);
            if (!taskbarButton) return;

            const hasOpenWindow = document.querySelector(`.window[data-title="${title}"]`) !== null;
            taskbarButton.classList.toggle('running', hasOpenWindow);
        }

        function updateWindowState(win) {
            if (!win || !win.dataset.title) return;
            const title = win.dataset.title;
            const iframe = win.querySelector('iframe');
            const state = {
                title,
                url: iframe ? iframe.src : app_links[title] || '',
                left: win.style.left || `${win.offsetLeft}px`,
                top: win.style.top || `${win.offsetTop}px`,
                width: win.style.width || `${win.offsetWidth}px`,
                height: win.style.height || `${win.offsetHeight}px`,
                minimized: win.classList.contains('minimized'),
                maximized: win.classList.contains('maximized'),
                zIndex: Number(win.style.zIndex) || zIndexCounter,
            };
            saveWindowState(state);
        }

        function restoreCachedWindows() {
            const savedWindows = getCachedWindows();
            if (!savedWindows.length) return;
            savedWindows.forEach(state => {
                createWindow(state.title, state.url, state);
            });
        }

        function createWindow(title, url, state = null) {
            // 이미 열려있는 창이 있는지 확인
            const windows = document.querySelectorAll('.window');
            for (let w of windows) {
                if (w.dataset.title === title) {
                    // 최소화 상태였다면 해제하고 맨 앞으로 가져오기
                    w.classList.remove('minimized');
                    w.style.zIndex = ++zIndexCounter;
                    logLauncherEvent(`launcher_window_restore_${title}`);
                    updateWindowState(w);
                    return;
                }
            }
            const taskbarButton = document.querySelector(`.taskbar-app[title="${title}"]`);
            if (taskbarButton) {
                taskbarButton.classList.add('running');
            }


            const win = document.createElement("div");
            win.className = "window";
            win.dataset.title = title;

            if (state && state.left) {
                win.style.left = state.left;
            } else {
                win.style.left = (100 + Math.random() * 150) + "px";
            }

            if (state && state.top) {
                win.style.top = state.top;
            } else {
                win.style.top = (50 + Math.random() * 100) + "px";
            }

            win.innerHTML = `
                <div class="window-header">
                    <span>${title}</span>
                    <div class="window-controls">
                        <button class="min-btn">─</button>
                        <button class="max-btn">□</button>
                        <button class="close-btn">✕</button>
                    </div>
                </div>
                <iframe src="${state && state.url ? state.url : url}"></iframe>
            `;

            const iframe = win.querySelector('iframe');
            iframe.addEventListener('load', () => {
                logLauncherEvent(`launcher_iframe_loaded_${title}`);
            });

            desktop.appendChild(win);
            if (state && state.zIndex) {
                win.style.zIndex = state.zIndex;
                zIndexCounter = Math.max(zIndexCounter, state.zIndex);
            } else {
                win.style.zIndex = ++zIndexCounter;
            }
            if (state && state.width) win.style.width = state.width;
            if (state && state.height) win.style.height = state.height;
            if (state && state.maximized) win.classList.add('maximized');
            if (state && state.minimized) win.classList.add('minimized');
            logLauncherEvent(`launcher_window_created_${title}`);
            updateWindowState(win);

            ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].forEach(direction => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${direction}`;
                win.appendChild(handle);

                handle.addEventListener('mousedown', (e) => {
                    if (win.classList.contains('maximized') || win.classList.contains('minimized')) return;

                    e.preventDefault();
                    e.stopPropagation();

                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startWidth = win.offsetWidth;
                    const startHeight = win.offsetHeight;
                    const startLeft = win.offsetLeft;
                    const startTop = win.offsetTop;

                    win.classList.add('resizing');
                    document.body.style.userSelect = 'none';

                    logLauncherEvent(`launcher_window_resize_start_${title}_${direction}`);

                    const onMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaY = moveEvent.clientY - startY;

                        let newWidth = startWidth;
                        let newHeight = startHeight;
                        let newLeft = startLeft;
                        let newTop = startTop;

                        if (direction.includes('e')) {
                            newWidth = Math.max(260, startWidth + deltaX);
                        }
                        if (direction.includes('w')) {
                            newWidth = Math.max(260, startWidth - deltaX);
                            newLeft = startLeft + (startWidth - newWidth);
                        }
                        if (direction.includes('s')) {
                            newHeight = Math.max(180, startHeight + deltaY);
                        }
                        if (direction.includes('n')) {
                            newHeight = Math.max(180, startHeight - deltaY);
                            newTop = startTop + (startHeight - newHeight);
                        }

                        win.style.width = `${newWidth}px`;
                        win.style.height = `${newHeight}px`;
                        win.style.left = `${newLeft}px`;
                        win.style.top = `${newTop}px`;
                        logLauncherEvent(`launcher_window_resize_${title}_${direction}_${Math.round(newWidth)}x${Math.round(newHeight)}`);
                    };

                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        win.classList.remove('resizing');
                        document.body.style.userSelect = '';
                        updateWindowState(win);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            });

            win.addEventListener("mousedown", () => {
                win.style.zIndex = ++zIndexCounter;
                logLauncherEvent(`launcher_window_focus_${title}`);
            });

            // 닫기
            win.querySelector(".close-btn").onclick = () => {
                win.remove();
                removeWindowState(title);
                syncTaskbarRunningState(title);
                logLauncherEvent(`launcher_window_close_${title}`);
            };

            // 최소화 (접기/펴기)
            win.querySelector(".min-btn").onclick = (e) => {
                e.stopPropagation();
                if (win.classList.contains("maximized")) win.classList.remove("maximized");
                win.classList.toggle("minimized");
                logLauncherEvent(`launcher_window_minimize_${title}_${win.classList.contains("minimized") ? "minimized" : "restored"}`);
                updateWindowState(win);
            };

win.querySelector(".max-btn").onclick = (e) => {
    e.stopPropagation();

    if (win.classList.contains("minimized"))
        win.classList.remove("minimized");

    win.style.transition =
        "left .28s cubic-bezier(.22,1,.36,1), " +
        "top .28s cubic-bezier(.22,1,.36,1), " +
        "width .28s cubic-bezier(.22,1,.36,1), " +
        "height .28s cubic-bezier(.22,1,.36,1), " +
        "border-radius .28s ease, " +
        "box-shadow .28s ease";

    win.classList.toggle("maximized");
    updateWindowState(win);

    const onEnd = () => {
        win.style.transition = "";
        win.removeEventListener("transitionend", onEnd);
    };

    win.addEventListener("transitionend", onEnd);
};

            // 드래그 로직
            const header = win.querySelector(".window-header");
            let dragging = false;
            let offsetX = 0;
            let offsetY = 0;

            header.addEventListener("mousedown", (e) => {
                if (win.classList.contains("maximized")) return;

                dragging = true;
                win.classList.add("dragging");
                logLauncherEvent(`launcher_window_drag_start_${title}`);
                
                offsetX = e.clientX - win.offsetLeft;
                offsetY = e.clientY - win.offsetTop;
            });

            document.addEventListener("mousemove", (e) => {
                if (!dragging) return;

                win.style.left = (e.clientX - offsetX) + "px";
                win.style.top = (e.clientY - offsetY) + "px";
                logLauncherEvent(`launcher_window_drag_move_${title}_${Math.round(win.offsetLeft)}_${Math.round(win.offsetTop)}`);
            });

            document.addEventListener("mouseup", () => {
                if (dragging) {
                    dragging = false;
                    win.classList.remove("dragging");
                    logLauncherEvent(`launcher_window_drag_end_${title}`);
                    updateWindowState(win);
                }
            });
        }

        // 태스크바 앱 클릭 이벤트
        document.querySelectorAll('.taskbar-app').forEach(button => {
            button.addEventListener('click', () => {
                const appName = button.title;
                logLauncherEvent(`launcher_taskbar_click_${appName}`);

                // 이미 열려있는 창을 찾아서 최상단으로 올림
                const existing = document.querySelector(`.window[data-title="${appName}"]`);
                if (existing) {
                    if (existing.classList.contains('minimized')) {
                        existing.classList.remove('minimized');
                    }
                    existing.style.zIndex = ++zIndexCounter;
                    logLauncherEvent(`launcher_window_bringtofront_${appName}`);
                    updateWindowState(existing);
                    return;
                }

                if (app_links[appName]) {
                    createWindow(appName, app_links[appName]);
                }
            });
        });

        const searchInput = document.getElementById('app-search-input');
        const searchResults = document.getElementById('search-results');

        searchInput.addEventListener('input', (event) => {
            renderSearchResults(event.target.value);
        });

        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const query = event.target.value.trim().toLowerCase();
                if (!query) return;
                const match = appNames.find(name => name.toLowerCase().includes(query));
                if (match) {
                    openAppByName(match);
                    searchInput.value = '';
                    renderSearchResults('');
                }
            }
            if (event.key === 'Escape') {
                searchInput.value = '';
                renderSearchResults('');
            }
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('#search-wrapper')) {
                searchResults.classList.remove('visible');
            }
        });

        restoreCachedWindows();
