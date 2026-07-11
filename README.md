# Nuvio Brief + Nuvio Pulse

Два независимых ежедневных крипто-брифа в Telegram из одного репозитория:

- **Nuvio Brief** — для новичков, 10:00 MSK, `src/*` + `src/blocks/*`, оркестрация `src/index.ts`.
- **Nuvio Pulse** — для трейдеров, 09:00 MSK, `src/pulse/*`, оркестрация `src/pulse/index.ts`.

Отдельные боты, отдельные каналы-секреты, отдельная идемпотентность, отдельные workflow.
`src/levels/` (детектор уровней поддержки/сопротивления) используется только Pulse'ом
(Блок 3) и общий для обоих в том смысле, что не относится ни к одному — самостоятельный
модуль.

## Локальный запуск

```bash
npm install
cp .env.example .env   # заполнить токены обоих ботов
npm start               # Nuvio Brief — реальная отправка в Telegram
npm run pulse:start     # Nuvio Pulse — реальная отправка в Telegram
```

Проверка сборки сообщения без реальной отправки:

```bash
DRY_RUN=1 npm start
DRY_RUN=1 npm run pulse:start
```

## Секреты

Добавить в GitHub → Settings → Secrets and variables → Actions:

**Nuvio Brief:**
- `TELEGRAM_BOT_TOKEN` — токен бота от @BotFather
- `TELEGRAM_CHANNEL_ID` — ID канала (бот должен быть в нём админом)
- `GROQ_API_KEY` — ключ console.groq.com (опционально — без него Блок 3 всегда
  использует нейтральный фолбэк, бриф всё равно уходит)
- `REF_LINK` — реф-ссылка для футера (опционально, по умолчанию `[ссылка]`)

**Nuvio Pulse:**
- `PULSE_TELEGRAM_BOT_TOKEN` — токен ВТОРОГО бота (не тот же, что у Brief)
- `PULSE_TELEGRAM_CHANNEL_ID` — ID канала (сейчас — тот же канал, что у Brief; см. §11 ТЗ Pulse)
- `PULSE_SWAP_LINK` — ссылка на LI.FI swap-виджет для футера (опционально, по умолчанию `[ссылка]`)

## Расписание

- `.github/workflows/daily-brief.yml` — cron `0 7 * * *` (= 10:00 MSK)
- `.github/workflows/pulse-brief.yml` — cron `0 6 * * *` (= 09:00 MSK, на час раньше Brief)

Оба — UTC+3 без перевода часов (Москва). Запуск вручную — "Run workflow" (workflow_dispatch).

## Идемпотентность

Раздельные файлы, оба коммитятся обратно в репозиторий соответствующим workflow после
успешной отправки:

- `state/last_sent_date.txt` — Nuvio Brief
- `state/pulse_last_sent_date.txt` — Nuvio Pulse
- `state/pulse_levels_announced_breakouts.json` — дедуп уже анонсированных пробоев
  детектора уровней (см. ниже); появляется только после первого реального пробоя.

## Банк советов (Блок 4 брифа новичков)

`src/blocks/advice.ts` — 60 советов (21 [скам] / 21 [термин] / 18 [ошибка]),
ротация одна запись в день по дате MSK (детерминированно, без повторов подряд
в пределах длины банка). Категория — метаданные бота, в сам пост не попадает.

## Детектор уровней (`src/levels/`)

Отдельный детерминированный модуль (пивоты → кластеризация → скоринг → пробой),
без ИИ. Используется Nuvio Pulse (Блок 3 «Уровень дня» и Блок 5 «Фокус дня»).
Параметры — `src/levels/config.ts`. Проверочный харнесс: `npm run levels:harness`
(отдельный workflow `.github/workflows/levels-harness.yml`, ручной запуск).

## Что не реализовано

- Nuvio Brief: новости в отборе события (§12 ТЗ Brief), мост Этапа 1, бот розыгрыша Bybit
- Nuvio Pulse: аномалия (Блок 2) считается только по вотчлисту (BTC/ETH/SOL/GRAM), без
  расширения на «топ-ликвид» вне вотчлиста (§4 ТЗ Pulse — помечено как открытая точка);
  Блок 5 «Фокус» — только бракет из детектора уровней, без макро-календаря (§7 ТЗ Pulse,
  явно вне MVP)
