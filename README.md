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

창 저장 코드 :

```js
fetch(
  "http://localhost:4047/savewindowdata/?windowdata=" +
  encodeURIComponent(JSON.stringify(windowData))
);
```

창 복원 코드 :

```js
fetch("http://localhost:4047/getwindowdata/");
```

</details>

<details>
<summary>앱</summary>

<details>
<summary>체크리스트</summary>

체크리스트 데이터 저장 :

```js
fetch(
  "http://localhost:4047/app/checklistsave/?data=" +
  encodeURIComponent(JSON.stringify(checklistData))
);
```

체크리스트 데이터 복구 :

```js
fetch("http://localhost:4047/app/checklistrestore/");
```

</details>

<details>
<summary>메모</summary>

메모 데이터 저장 :

```js
fetch(
  "http://localhost:4047/app/memosave/?data=" +
  encodeURIComponent(memoText)
);
```

메모 데이터 복구 :

```js
fetch("http://localhost:4047/app/memorestore/");
```

</details>

</details>

</details>

<details>
<summary>백엔드 체크리스트</summary>

- [x] 정적 파일 호스팅 서버 (5050)
- [x] 백엔드 API 서버 (4047)
- [x] 창(Window) 상태 저장
- [x] 창(Window) 상태 복원
- [x] 체크리스트 데이터 저장
- [x] 체크리스트 데이터 복원
- [x] 메모 데이터 저장
- [x] 메모 데이터 복원
- [ ] 업데이트 확인 API
- [ ] 버전 파일(version.json)
- [ ] 자동 백업 기능
- [ ] 로그 기록 기능

</details>
