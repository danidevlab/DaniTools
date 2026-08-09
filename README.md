# POLO-LAUNCHER
Polo launcher is great luncher. Made with danidevlab, PandaDevLab

POLO Launcher의 기능을 알아보세요

<details>
    <summary>브랜치 규칙</summary>
모든 수정사항이 있을 때는, 브랜치를 각자 만든 뒤, 그 브랜치에서 수정 후, 끌어와야 합니다.</br>
브랜치 이름은 자유롭게 할 수 있지만 자기 깃허브 아이디가 포함되어야 합니다.</br>
**예시: PandaDevLab_patch_9**
끌어오기 요청은 다른 사람이 수락해 줘야 합니다.</br>
하지만, 풀 리퀘스트를 만든 날의 자정이 지나면, 만든 사람이 수락할 수 있습니다.</br>
</br>
</details>
<details>
<summary>Shell</summary>

---

```bash
cls
```
콘솔을 비웁니다.

---

```bash
echo <문자>
```
`<문자>`에 입력된 값을 그대로 출력합니다. 메아리라고 생각하시면 편합니다.

</details>

<details>
    <summary>기본 앱</summary>
        1. 디데이(d-day.html)</br>
        2. 타이머(timer.html)</br>
        3. 주사위 던지기(dice.html)</br>
        4. 랜덤 선택(random.html)(미완성)</br>
        5. 돌림판(circlepan.html)</br>
        6. 점수판(scoreboard.html)</br>
        7. 메모(memo.html)</br>
        8. 소음 측정기(noise-meter.html)</br>
        9. QR 코드 생성기(qrcodemaker.html)</br>
        10. 실시간 시계(livetime.html)</br>
        11. 체크리스트(checklist.html)</br>
        12. ChatAI(chatai.html)(미완성)</br>
        13. 터미널(terminal.html)(미완성)</br>

</details>
<details>
<summary>Log</summary>
log기능 있음.</br>
오류가 있을때 로그파일 포함해서 이슈 올리면 답변 작성해 드립니다!</br>

---


클릭시 -> clickevent('x좌표,y좌표')</br>
입력시 -> keyboardevent('입력값')</br>
시스템 부팅 -> bootevent('on/off')</br>
앱 실행 -> appstart('앱명')</br>
새로운 앱 설치 -> appinstall('앱의 패키지명')</br>
앱에서 시스템 계층 호출 -> apptosystemcall('앱명','행동')
</details>
<details>
<summary>포트</summary>
log기능 있음.</br>
호스팅 : 6767(six-seven)
로그 전송 : 6766
플러그인 설치 : 6765
</details>
<details>
<summary>일정</summary>
7월 1일 오후 2시 40분 전화 통화를 통한 결정
</details>
<details>
<summary>로그</summary>
/log/log.txt에 저장됨.<br>

---

예시코드<br>
<code>fetch("http://localhost:6766/logwrite/?writedata=쓸 내용");<code><br>

---

로그 작성 결과 예시<br>
<code>
    memosaved(2026-07-05_14:11:10, page1)<br>
    memosaved(2026-07-05_14:11:15, page1)<br>
    memosaved(2026-07-05_14:11:17, page3)<br>
</code><br>
</details>
