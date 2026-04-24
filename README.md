# WebScrapingTool

A desktop application for interactive web scraping. It pairs a **control window** with a **handled window** driven by Playwright over the Chrome DevTools Protocol (CDP), letting the user navigate a real site, grab DOM elements as HTML / JSON / screenshots / PDF, and record network and console activity to timestamped log files.

_(Русская версия ниже -- see [Русский](#русский).)_

---

## What the app does

- Launches a second, fully-controllable Chromium window from the control UI and opens any `http(s)` URL in it.
- Captures any element on the page by selector / locator and saves it in four forms at once:
  - `*.html` -- the element's `outerHTML`
  - `*.json` -- a structured snapshot of the element
  - `*.jpeg` -- an element screenshot
  - `*.pdf` -- a PDF rendering of the element
- Records **network traffic** of the handled window in real time via CDP (`Network.requestWillBeSent`, `Network.responseReceived`, etc.) to a timestamped log file.
- Records **console messages** from the handled page (`page.on('console')`) to a separate timestamped log file.
- Streams both log streams live into an embedded **xterm.js terminal** inside the control window, with colored per-source tags.
- One-click "Open Output Folder" to jump straight to the saved data in the OS file manager.

All output lives under a single root folder:

```
%USERPROFILE%\Documents\WebScrapingTool\
├── saved_elements\<timestamp>\
│   ├── element.html
│   ├── element.json
│   ├── element.jpeg
│   └── element.pdf
└── logs\
    ├── network\network_<timestamp>.log
    └── console\console_<timestamp>.log
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Electron main process (Node.js)                                     │
│                                                                      │
│  ┌───────────────────────┐        ┌────────────────────────────┐     │
│  │ Control BrowserWindow │  IPC   │ Playwright-core            │     │
│  │ (Angular renderer)    │◄──────►│  connectOverCDP(ws://...)  │     │
│  │                       │ invoke │                            │     │
│  └───────────┬───────────┘ handle └──────────────┬─────────────┘     │
│              │                                   │                   │
│              │ preload (contextBridge)           │ CDP               │
│              │                                   │                   │
│  ┌───────────▼────────────────────┐ ┌────────────▼──────────────┐    │
│  │ xterm.js terminal (live logs)  │ │ Handled BrowserWindow     │    │
│  │ Notifications (ng-zorro)       │ │  - launched as Chromium   │    │
│  │ Browser / Element / Tools      │ │  - CDP enabled            │    │
│  └────────────────────────────────┘ └───────────────────────────┘    │
│                                                                      │
│  Static HTTP server serves Angular bundle in production              │
└──────────────────────────────────────────────────────────────────────┘
```

Key design decisions:

- **Two real Chromium windows.** The handled window is a separate `BrowserWindow` launched with remote-debugging enabled; Playwright attaches to it via `connectOverCDP`. That gives a genuine browsing target (cookies, service workers, extensions) while still being fully scriptable.
- **IPC via `invoke` / `handle`.** Every operation returns a typed `{ ok, message?, path?, logFilePath? }` result, so the renderer gets clean async ergonomics and real error messages for notifications.
- **`backgroundThrottling: false`** on the control window. Chromium throttles `requestAnimationFrame` when a window loses focus, which stalls Angular change detection. Disabling it -- combined with `NgZone.run` + `ChangeDetectorRef.markForCheck` + `ApplicationRef.tick` -- keeps the UI responsive even while the user works in the handled window.
- **Single output root** under `Documents/WebScrapingTool/`, resolved via `app.getPath('documents')`. `app.setName('WebScrapingTool')` runs before any path lookup so the folder name is stable.
- **Static HTTP server for the renderer** in production. The packaged app serves the built Angular bundle over `http://localhost:<port>` rather than `file://`, so relative assets and router behavior match dev mode.

### Project layout

```
web-scraping-tool/
├── electron/                 # Electron main + preload (separate npm package)
│   ├── src/main/             #   main process: windows, IPC, CDP loggers
│   ├── src/preload/          #   preload: contextBridge API surface
│   ├── electron.vite.config.ts
│   └── package.json          #   electron-builder config lives here
├── src/                      # Angular renderer
│   ├── app/
│   │   ├── app.{ts,html,css}
│   │   ├── sections/
│   │   │   ├── section-base.ts
│   │   │   ├── browser-section/
│   │   │   ├── element-section/
│   │   │   └── tools-section/
│   │   └── terminal/         #   xterm.js component
│   ├── index.html
│   └── styles.css
├── scripts/run-dev.ts        # dev orchestrator: ng serve + electron-vite dev
├── global.d.ts               # window.api typings for the renderer
└── package.json              # Angular + root scripts
```

---

## Requirements

- **Node.js 20.19+** (Angular 21 requires it).
- **npm 10+**.
- **Windows 10/11** for `npm run build:win`. Enable **Developer Mode** (Settings → Privacy & security → For developers) so electron-builder can create symlinks during packaging without admin rights.

---

## Run in dev mode

```bash
npm install
npm --prefix electron install
npm start
```

`npm start` runs `scripts/run-dev.ts`, which:

1. Starts `ng serve` on `http://localhost:4200`.
2. Waits for the dev server to be reachable.
3. Spawns `electron-vite dev` inside the `electron/` sub-package, which rebuilds main/preload on change and launches Electron pointing at the Angular dev server.

Changes in `src/` hot-reload via Angular; changes in `electron/src/` restart the Electron process automatically.

---

## Build a distributable

```bash
npm run build:win     # NSIS installer + portable win-unpacked (Windows)
npm run build:mac     # macOS (requires macOS host)
npm run build:linux   # Linux
```

`build:win` does two things:

1. `ng build --output-path=electron/resources` -- produces the production Angular bundle inside the electron sub-package.
2. `npm --prefix electron run build:win` -- runs `electron-vite build` then `electron-builder` to produce an NSIS installer and a `win-unpacked/` portable folder.

Artifacts appear in `electron/dist/`.

### Troubleshooting builds

- **`winCodeSign` cannot create symlink** → enable Windows Developer Mode, then retry. (electron-builder caches signing binaries as symlinks.)
- **File locked by running app** → close any previously-launched `WebScrapingTool.exe` before rebuilding.
- **Startup issues in the packaged app** → check `%APPDATA%\WebScrapingTool\logs\startup.log` (written by the main process during window creation and CDP handshake).
- **Buttons don't enable when the control window is in the background** → this is the Chromium throttling case; already handled by `backgroundThrottling: false` + forced `ApplicationRef.tick()`. If you fork the app, keep both in place.

---

<a id="русский"></a>

# WebScrapingTool (Русский)

Десктопное приложение для интерактивного веб-скрапинга. Объединяет **управляющее окно** и **управляемое окно** под управлением Playwright через Chrome DevTools Protocol (CDP): пользователь навигирует по реальному сайту, достаёт DOM-элементы в виде HTML / JSON / скриншотов / PDF и пишет логи сети и консоли в файлы с таймштампом.

---

## Что делает приложение

- Запускает отдельное полностью управляемое окно Chromium из управляющего UI и открывает в нём произвольный `http(s)` URL.
- Сохраняет любой элемент страницы по селектору/локатору сразу в четырёх формах:
  - `*.html` -- `outerHTML` элемента
  - `*.json` -- структурированный снимок элемента
  - `*.jpeg` -- скриншот элемента
  - `*.pdf` -- PDF-рендер элемента
- Пишет **сетевой трафик** управляемого окна в реальном времени через CDP (`Network.requestWillBeSent`, `Network.responseReceived` и т.д.) в файл с таймштампом.
- Пишет **консольные сообщения** управляемой страницы (`page.on('console')`) в отдельный лог-файл.
- Транслирует оба потока логов в живой терминал **xterm.js** внутри управляющего окна с цветными метками источника.
- Кнопка «Open Output Folder» открывает папку с результатами в проводнике ОС.

Все результаты складываются в единый корень:

```
%USERPROFILE%\Documents\WebScrapingTool\
├── saved_elements\<timestamp>\
│   ├── element.html
│   ├── element.json
│   ├── element.jpeg
│   └── element.pdf
└── logs\
    ├── network\network_<timestamp>.log
    └── console\console_<timestamp>.log
```

---

## Архитектура

```
┌──────────────────────────────────────────────────────────────────────┐
│  Electron main process (Node.js)                                     │
│                                                                      │
│  ┌───────────────────────┐        ┌────────────────────────────┐     │
│  │ Control BrowserWindow │  IPC   │ Playwright-core            │     │
│  │ (Angular renderer)    │◄──────►│  connectOverCDP(ws://...)  │     │
│  │                       │ invoke │                            │     │
│  └───────────┬───────────┘ handle └──────────────┬─────────────┘     │
│              │                                   │                   │
│              │ preload (contextBridge)           │ CDP               │
│              │                                   │                   │
│  ┌───────────▼────────────────────┐ ┌────────────▼──────────────┐    │
│  │ xterm.js terminal (live logs)  │ │ Handled BrowserWindow     │    │
│  │ Notifications (ng-zorro)       │ │  - запущен как Chromium   │    │
│  │ Browser / Element / Tools      │ │  - с включённым CDP       │    │
│  └────────────────────────────────┘ └───────────────────────────┘    │
│                                                                      │
│  Встроенный HTTP-сервер раздаёт Angular-бандл в production           │
└──────────────────────────────────────────────────────────────────────┘
```

Ключевые решения:

- **Два настоящих окна Chromium.** Управляемое окно -- это отдельный `BrowserWindow` с включённым remote-debugging; Playwright цепляется к нему через `connectOverCDP`. Получаем полноценную среду браузера (cookies, service workers, расширения), которой можно скриптовать.
- **IPC через `invoke`/`handle`.** Каждая операция возвращает типизированный `{ ok, message?, path?, logFilePath? }`, так что в renderer-е получается нормальный async и осмысленные сообщения об ошибках в нотификациях.
- **`backgroundThrottling: false`** на управляющем окне. Chromium душит `requestAnimationFrame` при потере фокуса, что тормозит Angular change detection. Отключение этого флага вместе с `NgZone.run` + `ChangeDetectorRef.markForCheck` + `ApplicationRef.tick` держит UI отзывчивым, даже пока пользователь работает в управляемом окне.
- **Единый корень вывода** в `Documents/WebScrapingTool/`, получаемый через `app.getPath('documents')`. Вызов `app.setName('WebScrapingTool')` идёт до любых path-lookup'ов, чтобы имя папки было стабильным.
- **Статический HTTP-сервер для renderer-а** в production. Упакованное приложение раздаёт собранный Angular-бандл по `http://localhost:<port>` вместо `file://`, благодаря чему относительные пути и роутинг ведут себя так же, как в dev-режиме.

### Структура проекта

```
web-scraping-tool/
├── electron/                 # Electron main + preload (отдельный npm-пакет)
│   ├── src/main/             #   main-процесс: окна, IPC, CDP-логгеры
│   ├── src/preload/          #   preload: API через contextBridge
│   ├── electron.vite.config.ts
│   └── package.json          #   здесь же конфиг electron-builder
├── src/                      # Angular renderer
│   ├── app/
│   │   ├── app.{ts,html,css}
│   │   ├── sections/
│   │   │   ├── section-base.ts
│   │   │   ├── browser-section/
│   │   │   ├── element-section/
│   │   │   └── tools-section/
│   │   └── terminal/         #   компонент xterm.js
│   ├── index.html
│   └── styles.css
├── scripts/run-dev.ts        # dev-оркестратор: ng serve + electron-vite dev
├── global.d.ts               # типы window.api для renderer-а
└── package.json              # Angular + корневые скрипты
```

---

## Требования

- **Node.js 20.19+** (требование Angular 21).
- **npm 10+**.
- **Windows 10/11** для `npm run build:win`. Включите **Режим разработчика** (Параметры → Конфиденциальность и защита → Для разработчиков), чтобы electron-builder мог создавать симлинки без прав администратора.

---

## Запуск в dev-режиме

```bash
npm install
npm --prefix electron install
npm start
```

`npm start` запускает `scripts/run-dev.ts`, который:

1. Поднимает `ng serve` на `http://localhost:4200`.
2. Ждёт доступности dev-сервера.
3. Запускает `electron-vite dev` внутри под-пакета `electron/`. Тот пересобирает main/preload при изменениях и стартует Electron, указывающий на Angular dev-сервер.

Правки в `src/` подтягиваются hot-reload'ом Angular; правки в `electron/src/` автоматически перезапускают Electron-процесс.

---

## Сборка дистрибутива

```bash
npm run build:win     # NSIS-инсталлятор + portable win-unpacked (Windows)
npm run build:mac     # macOS (нужен macOS-хост)
npm run build:linux   # Linux
```

`build:win` делает две вещи:

1. `ng build --output-path=electron/resources` -- production-сборка Angular внутрь под-пакета electron.
2. `npm --prefix electron run build:win` -- `electron-vite build`, затем `electron-builder`: создаются NSIS-инсталлятор и портативная папка `win-unpacked/`.

Артефакты появляются в `electron/dist/`.

### Диагностика сборки

- **`winCodeSign` не может создать симлинк** → включите Режим разработчика Windows и повторите. (electron-builder кэширует подписные бинарники как симлинки.)
- **Файл заблокирован запущенным приложением** → закройте ранее запущенный `WebScrapingTool.exe` перед повторной сборкой.
- **Проблемы со стартом упакованного приложения** → смотрите `%APPDATA%\WebScrapingTool\logs\startup.log` (main-процесс пишет туда при создании окон и CDP-хендшейке).
- **Кнопки не включаются, пока управляющее окно не в фокусе** → это как раз случай с Chromium throttling; уже решено `backgroundThrottling: false` + принудительным `ApplicationRef.tick()`. При форке оставьте оба изменения.
