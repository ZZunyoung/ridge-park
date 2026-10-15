# RIDGE PARK

휴대폰을 핸들로 사용하는 브라우저 3D 주차 게임입니다. 넓은 주차장 입구에서 출발해 경유지를 지나 지정된 구획에 주차합니다. PC 키보드만으로도 플레이할 수 있습니다.

- 80 × 84m 주차장, 이동 코스가 다른 5개 라운드
- 전진·후진·평행·사선 주차, 미니맵과 순서별 경유지
- 탑뷰·3인칭·1인칭 전환
- 휴대폰 기울기 조향, 가속·브레이크, D/R 기어, 중앙 보정
- 미터 단위 차량·주차칸 비율, 뒷차축 기준 저속 조향 모델
- 전진 최고속도 25km/h

## PC에서 바로 실행

**Node.js 22.13 이상**, npm, WebGL을 지원하는 브라우저가 필요합니다. 별도 DB나 API 서버, 로그인, 유료 API 키는 필요하지 않습니다.

저장소를 clone하거나 ZIP을 풀고 프로젝트 폴더에서 실행하세요.

```bash
npm ci
npm run dev
```

PC 브라우저에서 **http://127.0.0.1:5173**을 열면 됩니다. 서버를 종료하려면 터미널에서 `Ctrl+C`를 누르세요. `index.html`을 더블클릭하는 방식은 지원하지 않습니다.

| 키 | 동작 |
| --- | --- |
| W / ↑ | 전진 |
| S / ↓ | 후진 |
| A D / ← → | 조향 |
| Space | 브레이크 |
| Q | D/R 기어 전환 |
| C | 탑뷰 → 3인칭 → 1인칭 |
| R | 현재 라운드 다시 시작 |
| Enter | 주차 성공 후 다음 라운드 |

W/S는 진행 방향을 선택하면서 가속합니다. Space로 멈춘 뒤 방향을 바꾸면 조작하기 쉽습니다.

## 휴대폰을 핸들로 연결

PC와 휴대폰을 **같은 Wi-Fi**에 연결하세요. 휴대폰 브라우저의 기울기 센서를 사용하려면 **휴대폰에서도 신뢰하는 HTTPS 인증서**가 필요합니다. PC의 `localhost`는 휴대폰에서 PC를 가리키지 않습니다.

### 1. 인증서 도구와 PC 주소 준비

[mkcert 공식 설치 안내](https://github.com/FiloSottile/mkcert#installation)에 따라 mkcert를 설치합니다. macOS에서는 다음과 같이 설치할 수 있습니다.

```bash
brew install mkcert
mkcert -install
```

Windows는 공식 안내의 설치 방법을 사용하고, 설치 후 PowerShell에서 `mkcert -install`을 실행하세요.

PC의 Wi-Fi IPv4 주소를 확인합니다. macOS는 시스템 설정의 Wi-Fi 상세 정보, Windows는 `ipconfig`의 Wi-Fi IPv4 주소를 확인하면 됩니다. 아래의 **192.168.0.10은 예시이므로 실제 PC 주소로 바꾸세요.**

macOS / Linux:

```bash
mkdir -p .certs
mkcert -cert-file .certs/local.pem -key-file .certs/local-key.pem localhost 127.0.0.1 192.168.0.10
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force .certs
mkcert -cert-file .certs/local.pem -key-file .certs/local-key.pem localhost 127.0.0.1 192.168.0.10
```

인증서는 `.gitignore`로 제외됩니다. PC의 IP가 바뀌면 새 IP를 포함해 인증서를 다시 만드세요.

### 2. 휴대폰에서 CA 인증서 신뢰

```bash
mkcert -CAROOT
```

위 명령이 출력한 폴더의 **`rootCA.pem`만** 휴대폰에 옮겨 설치합니다. 개인 키인 `rootCA-key.pem`은 옮기거나 공유하지 마세요.

- **iPhone:** CA 인증서 프로파일을 설치한 뒤, 설정의 인증서 신뢰 설정에서 해당 CA의 전체 신뢰를 활성화합니다. Safari를 사용하세요.
- **Android:** 기기의 보안/인증서 설정에서 CA 인증서를 설치합니다. 메뉴 이름은 제조사에 따라 다릅니다.

인증서 경고가 뜬다면 단순히 경고를 무시하는 대신, CA 신뢰와 인증서에 포함한 IP가 맞는지 확인하세요. 자세한 내용은 [mkcert의 모바일 기기 안내](https://github.com/FiloSottile/mkcert#mobile-devices)를 참고하세요.

### 3. HTTPS 게임 서버 실행

```bash
npm run dev:https
```

**PC에서도** `https://192.168.0.10:5173`처럼 PC의 실제 사설 IP 주소를 엽니다. PC 게임에서 `휴대폰 연결`을 누르고 휴대폰으로 QR코드를 스캔하세요. PC 방화벽에서 필요하면 개인 네트워크의 5173 포트 접근을 허용하세요.

휴대폰에서 `센서 허용 · 시작` → 가로로 세워 잡기 → `중앙 보정` 순서로 진행합니다. 좌우로 돌려 조향하고 `GAS`/`BRAKE`, `D/R` 버튼을 사용하세요. 화면을 바닥과 평행하게 눕히면 안정적인 조향이 어렵습니다.

> 로컬 실행 시 ChatGPT 로그인은 필요 없습니다. 휴대폰 연결은 PeerJS 공개 시그널링 서버와 WebRTC를 사용하므로 인터넷이 필요합니다. 현재 완전한 오프라인 휴대폰 연결이나 자체 TURN 서버는 제공하지 않습니다. 공유기·방화벽 환경에 따라 연결이 제한될 수 있습니다.

센서를 사용하지 않고 터치 조향 버튼만 시험하려면 `npm run dev:lan`으로 HTTP LAN 서버를 열 수도 있습니다. 이 경우에도 PC에서 사설 IP 주소로 게임을 열어야 QR 링크가 맞습니다.

## 게임 규칙

1. 주황색 경유지를 **순서대로** 통과합니다. 미니맵은 내 차, 다음 경유지와 주차 목표를 표시합니다.
2. 목표 구역에 도착하면 초록색 주차칸으로 들어갑니다.
3. 차 전체가 주차선 안에 있고, 지정 방향과 12° 이내로 정렬된 상태에서 1.2초 정차하면 성공입니다. 실제 공간이 좁으면 허용되는 각도도 자연히 더 작아집니다.
4. 소요 시간과 접촉 횟수로 별점을 받습니다. 충돌하면 해당 이동을 막고 접촉을 기록합니다.

## 빌드와 검증

```bash
npm test
npm run build
npm run preview
```

`dist/`에 정적 배포 파일이 생성됩니다. 빌드 미리보기는 **http://127.0.0.1:4173**입니다. 휴대폰 센서 시험에는 위의 HTTPS 실행 방법을 사용하세요.

테스트는 센서 조향·입력 전달, 회전 궤적, 차체 크기, 충돌과 주차 판정, 경유지 순서와 통로, 평행주차 진입 경로를 검사합니다. 게임 흐름 테스트의 WebGL 렌더러는 대체 구현을 사용하므로 실제 브라우저 화면과 실제 휴대폰 검증을 대신하지 않습니다.

## 차량과 주차장 비율

| 항목 | 적용값 |
| --- | --- |
| 차체 길이 × 폭 × 높이 | 약 4.915 × 1.839 × 1.445m |
| 축간거리 | 약 2.824m |
| 최소 회전반경 | 약 5.700m, 바깥 앞타이어 가장자리 기준 |
| 일반형 구획 | 2.5 × 5.0m |
| 확장형 구획 | 2.6 × 5.2m |
| 평행주차 구획 | 2.0 × 6.0m |

차량 제원은 2025 Toyota Camry LE 브로슈어를 참고했습니다. 차체 모델은 코드로 만든 독자적인 단순 모델이며 제조사의 공식 모델이 아닙니다. 앞뒤 오버행은 균등 배분한 가정입니다. 조향은 저속 bicycle 모델과 Ackermann 앞바퀴 각도를 사용하고, 타이어 미끄러짐과 서스펜션 동역학은 생략합니다. 조향 속도·가감속은 게임용 설정입니다.

평행주차 구역은 직각 주차 열에서 분리했고 앞뒤 차량 사이에 여유를 둡니다. 정지 상태에서 핸들을 바꾼 뒤 두 개의 후진 원호로 주차하는 경로를 수치 검사합니다. 게임 전체를 실제 차량의 운전 훈련용 시뮬레이터로 검증한 것은 아닙니다.

## 프로젝트 구성

```text
src/main.js           휴대폰 컨트롤러와 진입점
src/parking.js        3D 화면·카메라·입력·게임 진행
src/parking-rules.js  맵·경유지·충돌·주차 판정
src/vehicle.js        차량 제원과 저속 주행 모델
src/steering.js       기울기 센서와 핸들 보정
tests/                동작·기하·게임 흐름 테스트
vite.config.js        로컬 HTTP/HTTPS와 정적 빌드 설정
```

Three.js, PeerJS, QRCode, Vite를 사용합니다. 차량과 지형은 코드로 생성하며 원작 게임의 모델이나 텍스처를 사용하지 않습니다. 웹 폰트는 네트워크가 없을 때 시스템 폰트로 대체됩니다.

## 참고 자료

- [Vite 서버 설정](https://vite.dev/config/server-options)
- [로컬 HTTPS 안내](https://web.dev/articles/how-to-use-local-https)
- [mkcert](https://github.com/FiloSottile/mkcert)
- [2025 Camry 공식 브로슈어, 제원 18쪽](https://www.toyota.com/content/dam/toyota/brochures/pdf/2025/my25-camry-ebrochure.pdf)
- [주차장법 시행규칙 제3조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1025436739)
- [Bicycle kinematics](https://www.mathworks.com/help/nav/ref/bicyclekinematics.html)
