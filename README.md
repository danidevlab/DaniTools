# DaniTools
DaniTools는 심플하고 강력한 POLO LAUNCHER 기반 프로그램입니다.(POLO LAUNCHER의 커밋 8df2852까지 일부 참조)

<details>
<summary>포트</summary>
호스팅 : 5050
백엔드 처리 : 4047
</details>
<details>
<summary>파일 구조</summary>
📦 Program<br>
 ┣ 📂 frontend<br>
 ┃ ┗ 📜 <br>
 ┣ 📂 backend<br>
 ┃ ┗ 📜 <br>
 ┣ 📂 userdata<br>
 ┃ ┗ 📜 <br>
 ┗ 📜 README.md<br>
</details>
<details>
<summary>백엔드 저장</summary>
    <details>
    <summary>창(Window)</summary>
    창 저장 코드 : fetch(`http://localhost:4047/savewindowdata/?windowdata=)
    창 복원 코드 : fetch(http://localhost:4047/getwindowdata/)
    </details>
    <details>
    <summary>앱</summary>
        <details>
        <summary>앱</summary>
        체크리스트 데이터 저장 : fetch(http://localhost:4047/app/checklistsave/?data=)
        체크리스트 데이터 복구 : fetch(http://localhost:4047/app/checklistrestore/)
        메모 데이터 저장 : fetch(http://localhost:4047/app/memosave/?data=)
        메모 데이터 복구 : fetch(http://localhost:4047/app/memorestore/)
        </details>
    </details>
</details>