# Cloudflare Worker — архив (НЕ используется)

## Что здесь
Временная попытка мигрировать деплой с Vercel на Cloudflare Workers
(середина 2026, см. коммиты `0ae22f9`…`084444f` в истории).

- `worker.js` — entrypoint Cloudflare Worker, дословный порт логики
  из `api/config.mjs` + `api/requests.mjs` под формат Worker
  (`process.env` → `env`, `req.query` → `new URL(request.url).searchParams`,
  `res.status()` → `new Response()`).
- `wrangler.jsonc` — конфиг деплоя: `main: "src/index.js"`,
  `assets.directory: "./public"`, `vars.SUPABASE_ADMIN_EMAIL`.

## Почему архивировано
Деплой на Cloudflare Workers в РФ заблокирован (трафик к
Cloudflare-инфраструктуре ограничен). Сайт работает на Vercel
(https://music-school-chi-lyart.vercel.app) через serverless-функции
в `api/*.mjs`. Worker-версия не запускается и не нужна для текущего
деплоя.

## Что делать, если захочется «оживить»
Не стоит. Если деплой из РФ — Vercel работает. Если нужна
edge-инфраструктура — Vercel Edge Functions дают то же самое без
миграционных рисков.

Если всё-таки понадобится: скопировать `worker.js` обратно в
`src/index.js`, `wrangler.jsonc` — в корень, и поднять секреты через
`wrangler secret put` (Cloudflare). Но это **отдельный** проект.
