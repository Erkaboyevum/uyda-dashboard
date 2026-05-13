# UYDA Unified — Telegram Mini App

Merged app combining **UYDA Kollega** (cash-flow management for cashiers) and **UYDA Controller** (online sales analytics dashboard) into one unified Telegram Mini App.

---

## Running locally

```bash
npm install
npm run dev
```

The dev server starts on `http://localhost:5173`. For Telegram Mini App testing, expose it with [ngrok](https://ngrok.com/):

```bash
ngrok http 5173
```

Then set the ngrok URL as your bot's Mini App URL in BotFather.

---

## Build for production

```bash
npm run build
```

Output is in `dist/`. Serve `dist/` from any static host.

---

## Deploy to Netlify

1. Push `uyda-unified/` to a GitHub repo.
2. Netlify → New site → connect repo. Build command: `npm run build`, publish dir: `dist`.
3. Add `public/_redirects` with `/* /index.html 200` for SPA routing (or use the existing `netlify.toml`).

## Deploy to Vercel

```bash
vercel --prod
```

Set build command `npm run build`, output directory `dist`.

---

## Register with BotFather

1. [@BotFather](https://t.me/BotFather) → `/newbot` → follow prompts.
2. `/newapp` → select bot → paste production URL.
3. Link format: `t.me/YourBot/app`.

---

## ⚠️ Role names — action required

Edit `src/utils/permissions.js` once you confirm the **exact role strings** from  
`Перечисления.ТелеграмПользовательДолжность` in 1C:

```js
const CASH_ROLES      = ['OS_manager', 'Кассир', 'Admin', 'Администратор', 'Руководитель'];
const ANALYTICS_ROLES = ['Менеджер', 'Manager', 'Admin', 'Администратор', 'Руководитель'];
```

| Role | Documents | Feedbacks | Analytics | Profile |
|------|-----------|-----------|-----------|---------|
| Кассир / OS_manager | ✅ | ✅ | ❌ | ✅ |
| Менеджер / Manager | ❌ | ✅ | ✅ | ✅ |
| Admin / Руководитель | ✅ | ✅ | ✅ | ✅ |

---

## Manual test checklist

- [ ] **Cashier** (`Кассир`) → Documents + Feedbacks + Profile; **no** Analytics tab
- [ ] **Manager** (`Менеджер`) → Feedbacks + Analytics + Profile; **no** Documents tab
- [ ] **Admin** → all 4 tabs visible
- [ ] FAB "+" button appears **only** on Documents screen
- [ ] Document creation form works end-to-end
- [ ] Analytics → Диаграммалар sub-tab: filters do NOT auto-apply; only "Қўллаш" triggers fetch
- [ ] Analytics → Буюртмалар sub-tab: client-side search works; tap card opens detail sheet
- [ ] Order detail: phone link opens dialer; map button calls `Telegram.WebApp.openLink`
- [ ] "Яна юклаш" loads next page of orders
- [ ] Today's sales card on Documents screen visible for analytics roles only
- [ ] Language toggle Uzbek Cyrillic ↔ Russian applies to analytics screen too
- [ ] Telegram BackButton closes detail sheet / navigates back
- [ ] Loading skeletons appear; empty state shows pink `#FEE2E2` card
- [ ] `npm run build` → zero errors

---

## Project structure

```
src/
├── config/
│   ├── api.js              Kollega API base URL
│   └── analyticsApi.js     Analytics API URL + auth header
├── composables/
│   ├── useCurrentUser.js   Singleton user store (role, name, etc.)
│   ├── useOrderAnalysis.js Singleton analytics data hook (shared by sub-tabs)
│   └── useTodayAnalytics.js  Today-only analytics for Documents overview card
├── utils/
│   ├── permissions.js      canAccessCash / canAccessAnalytics / isAdmin
│   ├── format.js           Number / date / currency formatters
│   └── statusColor.js      Status → hex color map (kollega palette)
├── components/
│   ├── BottomBar.vue       Dynamic tab bar (role-based)
│   ├── TodaySalesCard.vue  Today's sales summary card
│   └── analytics/
│       ├── FilterPanel.vue
│       ├── SummaryCards.vue
│       ├── StatusBadge.vue
│       ├── Charts/         StatusDonut · CurrencyBarChart · StackedStatusByCurrency
│       ├── Orders/         OrderCard · OrderList · OrderDetailSheet · DetailRow
│       └── Skeletons/      CardSkeleton · ChartSkeleton
├── views/
│   ├── WelcomeView.vue     Boot screen: calls /user, routes by role
│   ├── DocumentsView.vue   Cash-flow docs + TodaySalesCard for analytics roles
│   ├── AnalyticsView.vue   Charts + Orders in sticky sub-tabs
│   └── ...                 All other kollega screens unchanged
└── locales/
    ├── russian.js
    └── uzbek-crylic.js
```
