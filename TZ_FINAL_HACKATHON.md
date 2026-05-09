# SignalCred — Фінальне ТЗ для The Bags Hackathon
## Версія 3.0 — Конкурентна стратегія + детальна специфікація

---

## Чому SignalCred — один продукт, а не набір фіч під треки

Проблема більшості проектів на цьому хакатоні:
- Launchpad-и є (BagScan, The Bags AI Launchpad) — але токен після launch залишається сам по собі
- Аналітика є (TokenSight, CreatorRadar) — але вона читає дані, нічого не будує
- Fee tools є (BagsFuel, Tend) — але це ізольований кабінет, не пов'язаний з продуктом
- Соціальне є тільки у вигляді quest-платформ (Blackhole) — без контексту токена

**SignalCred вирішує одну реальну проблему:** після launch токен вмирає, бо немає де йому жити.

Наш продукт — це не "launchpad з соцмережею". Це **launch-to-community pipeline**: токен запускається і одразу отримує сторінку, community, trading, earnings — все в одному місці. Саме тому кожен трек, на який ми претендуємо, виростає природньо з цієї ідеї, а не пришитий окремо.

---

## Треки — чому ми на них і що конкретно робимо

### Трек 1: Social Finance ← головний, майже порожній

**Конкуренти:** Patronage (membership gating), Blackhole (quests без стрічки) — обидва не роблять реальну соцмережу навколо токенів.

**Наша позиція:** SignalCred — єдина платформа де токен після launch живе в соціальному контексті. Це Binance Square, але побудоване навколо Bags-токенів, а не новин.

**Що треба зробити:**

#### 1.1 Feed із трьома рівнями контенту
- **Global feed** — всі пости від усіх users, сортування trending/new/launches
- **Token feed** — пости прив'язані до конкретного mint (на Token Page)
- **Following feed** — пости від wallets які ти followиш

Типи постів: `launch` | `update` | `analysis` | `meme` | `trade_idea`

#### 1.2 Auto-generated Launch Post (killer feature)
Коли токен успішно запускається → система автоматично публікує у Feed:
```
🚀 $DUST is LIVE on Bags!

[AI-generated pitch: "Founder Dust turns every degen into a dust collector..."]

📊 Market cap: $42,000 | Initial buy: 0.1 SOL
🔗 Trade: signalcred.xyz/token/[mint]
```
Це ВАЖЛИВО показати суддям — Launch Post з'являється автоматично, без дій користувача.

#### 1.3 Token Social Score (метрика)
Кожен токен отримує Social Score = сума активності:
```
score = (posts * 3) + (likes * 1) + (comments * 2) + (unique_wallets_interacted * 5)
```
Цей score впливає на позицію в Trending. Видно на Token Page як "Community Score: 847".

#### 1.4 Cashtag система
У будь-якому пості `$TICKER` → кліком відкриває Token Page. Автоматичний parse і підсвічування.

#### 1.5 Wallet-to-wallet тіппінг у постах (Social Finance маркер)
На кожному пості кнопка "Tip" → відправляє 0.01–1 SOL автору поста. Це real payments в соціальному контексті і закриває одночасно Social Finance + Payments трек.

**Чому це Social Finance а не просто "соцмережа":** кожна взаємодія у feed прив'язана до фінансового активу (токена). Лайк = сигнал про інтерес до токена. Follow = слідкуєш за creator'ом чиї токени потенційно хочеш купити. Тіп = прямий payment за контент навколо токена.

---

### Трек 2: Claude Skills ← вільний трек, ніхто не подає справжній Skill

**Конкуренти:** BagOS (MCP сервер для Claude — це AI Agent, не Skill), BagsFuel (згадують Claude у README але не роблять Skill).

**Різниця між AI Agent і Claude Skill:**
- **AI Agent** = BagOS: Claude керує SDK, виконує дії
- **Claude Skill** = інструмент ВСЕРЕДИНІ Claude, що розширює його можливості для конкретного workflow

**Наша позиція:** SignalCred будує Claude Skills для creator workflow — набір спеціалізованих промптів і tools які роблять Claude ефективним асистентом для запуску токенів.

**Що треба зробити:**

#### 2.1 Token Launch Skill (core)
Claude отримує контекст: name, symbol, theme → генерує повний пакет:
- `description` — 2-3 речення, casual crypto tone
- `lore` — backstory/mythology
- `launchPost` — tweet-size, hype, включає $TICKER
- `pitch` — one-liner для X/Twitter
- `tags[]` — 4-5 тегів для категоризації
- `riskChecklist[]` — 3 реальних ризики для honest marketing

Реалізація: `POST /api/ai/token-draft` → `generateTokenDraft()` з Anthropic SDK.

**У UI** — окрема вкладка "AI Assisted" в Launch Studio з кнопкою "Generate with Claude".

#### 2.2 Token Analysis Skill (нова фіча)
На Token Page — кнопка "Ask Claude about this token". Claude отримує:
- Поточна ціна, market cap, 24h change (з Birdeye)
- Всі пости з соцстрічки про цей токен
- Creator wallet history (скільки токенів запустив)
- Volume за 7 днів

→ Claude генерує structured analysis:
```json
{
  "sentiment": "bullish|neutral|bearish",
  "summary": "...",
  "redFlags": ["..."],
  "positiveSignals": ["..."],
  "recommendation": "..."
}
```

#### 2.3 Creator Profile Skill (нова фіча)
На сторінці Profile — "Write my bio with Claude".
Вхід: список запущених токенів, total fees earned, posts history
→ Claude генерує professional bio для creator.

#### 2.4 Post Composer Skill
У Feed composer — кнопка "Help me write this post".
Вхід: тип поста (analysis/meme/update), обраний токен
→ Claude генерує draft поста який user може відредагувати.

**Чому це реальний Claude Skill а не "просто AI":** кожен Skill має специфічний контекст з Bags ecosystem (реальні дані токена, реальні SDK данні), конкретний output формат, і прямо вбудований у creator workflow а не є окремим AI chatbot.

---

### Трек 3: Fee Sharing ← середня конкуренція, але наш підхід унікальний

**Конкуренти:**
- BagsFuel: claim fees → автоматично buyback і distribute holders (вузько, тільки для creators)
- Tend: fee automation + fraud detection через Squads (складно, power users)

**Наша позиція:** SignalCred робить fee sharing ВИДИМИМ і СОЦІАЛЬНИМ. Не просто "claim кнопка", а публічний dashboard який показує ecosystem health.

**Що треба зробити:**

#### 3.1 Creator Fee Dashboard (є, але треба покращити)
- Claimable positions з SDK (реалізовано)
- **Додати:** Lifetime fees earned per token (Bags API `/tokens/:mint/fees/lifetime`)
- **Додати:** Fee claim history таблиця (tx signature + amount + date)
- **Додати:** Projected monthly earnings (на основі 7d volume × fee rate)

#### 3.2 Public Fee Leaderboard (нова фіча — Social Finance + Fee Sharing перетин)
Публічна сторінка `/leaderboard`:
```
Rank | Creator | Total Fees Earned | Top Token | 30d Volume
  1  | abc...def |   184.2 SOL    |  $DUST    |  $2.1M
  2  | xyz...123 |    92.1 SOL    |  $MOON    |  $1.8M
```
Дані: real Bags API lifetime fees per token, агреговані по creator wallet.

Це ВАЖЛИВО для суддів — публічна верифікація що fee sharing реально працює в нашій платформі.

#### 3.3 Fee Split Visualizer (нова фіча)
На Token Page → Fees tab: доnat-chart який показує:
- 75% — Creator fee share (зелений)
- 25% — SignalCred platform (фіолетовий)
- Реальні числа: "Creator earned: 12.4 SOL | Platform earned: 4.1 SOL"

#### 3.4 Auto Fee Config при Launch (є, треба показати у UI)
Launch Studio Step 2 повинен ЯВНО показувати:
```
Fee Configuration:
✅ Creator share: 75% (7,500 bps)
✅ Platform share: 25% (2,500 bps)  ← SignalCred partner fee
✅ Total: 100% (10,000 bps) ✓
```
Це показує суддям що fee sharing не просто "є", а конфігурується автоматично при кожному launch.

---

### Трек 4: Bags API ← обов'язковий baseline

**Наша позиція:** Максимально широке покриття SDK, не просто один endpoint.

**SDK coverage checklist (те що треба показати в Docs і README):**

| SDK Method | Використання в SignalCred |
|------------|--------------------------|
| `sdk.tokenLaunch.createTokenInfoAndMetadata()` | Launch Studio — Step 1 |
| `sdk.config.createBagsFeeShareConfig()` | Launch Studio — Step 2 |
| `sdk.tokenLaunch.createLaunchTransaction()` | Launch Studio — Step 3 |
| `sdk.trade.getQuote()` | Token Page — Trade Panel |
| `sdk.trade.createSwapTransaction()` | Token Page — Trade Panel |
| `sdk.fee.getAllClaimablePositions()` | Fees Dashboard |
| `sdk.fee.getClaimTransactions()` | Fees Dashboard — Claim |
| `sdk.partner.getPartnerConfig()` | Partner Dashboard |
| `sdk.partner.getPartnerConfigClaimStats()` | Fees Dashboard |

**Що ще треба додати:**
- `sdk.partner.getPartnerConfigClaimTransactions()` — claim partner fees (не тільки creator)
- Показати в Docs page реальний покриття з галочками

---

## Що НЕ робимо і чому

### ❌ DeFi трек — не чіпаємо
Причина: щоб зайти в DeFi треба реальна механіка (liquidity pools, lending, yield). Половинчасте рішення типу "fee reinvestment" виглядає слабо поруч з SparmFi (128 AI agents) чи реальними DeFi протоколами. Краще мати 4 сильних треки ніж 5 слабких.

### ❌ Privacy трек — не чіпаємо
Aura і Bags Trust Layer там, але обидва без SDK. Ми не робимо stealth addresses.

### ❌ AI Agents трек — не чіпаємо як primary
BagOS домінує — опублікований npm пакет з 15+ tools, Jest тести. Ми не б'ємося лобово. Але наш Claude Analysis feature можна ЗГАДАТИ як "lightweight AI agent for token analysis" у описі без претензії на цей трек як primary.

### ❌ Payments трек — тільки як бонус
Тіппінг у постах — це payments. Але не заявляємо як окремий трек, він органічно входить в Social Finance.

---

## Пріоритет розробки

### P0 — без цього нема submission

**1. Launch Studio — повний flow з реальним SDK (є, перевірити)**
- [ ] `createTokenInfoAndMetadata` → `createBagsFeeShareConfig` → `createLaunchTransaction`
- [ ] Всі txs підписуються через wallet adapter
- [ ] Step tracker показує реальний прогрес (не fake)
- [ ] Auto Launch Post після підтвердження tx

**2. Token Page — мінімальний working**
- [ ] Header з ціною з Birdeye
- [ ] Trade Panel: getQuote → createSwap → sign → confirm
- [ ] Social tab з постами про токен

**3. Feed — базовий working**
- [ ] POST пост → зберігається в БД
- [ ] GET posts за tabs (new/trending/launches)
- [ ] Like/unlike — реальний toggle

**4. Claude AI у Launch Studio**
- [ ] Кнопка "Generate with Claude" → реальний API call → заповнює форму
- [ ] Launch Post поле редагується перед launch

**5. Fee Dashboard — базовий**
- [ ] `getAllClaimablePositions` → список позицій
- [ ] Claim кнопка → підписати tx

**6. ENV налаштування і деплой**
- [ ] DATABASE_URL → Neon (push schema)
- [ ] BAGS_API_KEY → з dev.bags.fm
- [ ] BIRDEYE_API_KEY → з birdeye.so
- [ ] ANTHROPIC_API_KEY
- [ ] SOLANA_RPC_URL → Helius
- [ ] Vercel деплой з публічним URL

---

### P1 — для перемоги, не виживання

**7. Token Analysis Skill (Claude)**
```typescript
// app/api/ai/token-analysis/route.ts
// Збираємо: price + social posts + creator history
// → Claude генерує structured analysis
// → Показуємо на Token Page як "AI Analysis" card
```

**8. Fee Leaderboard**
```typescript
// /leaderboard page
// GET /api/leaderboard → tokens ordered by lifetime fees
// Real data from Bags API
```

**9. Fee Split Visualizer**
```typescript
// Donut chart на Token Page → Fees tab
// 75% creator / 25% platform — real numbers
```

**10. Social Score на токенах**
```typescript
// Підраховується з posts + likes + comments
// Показується в Trending sort
```

**11. Tipping у постах**
```typescript
// Кнопка Tip на PostCard
// SOL transfer через sendTransaction
// Записується як fee_event у БД
```

**12. Launch Post Visualizer у success screen**
Після launch показувати не просто "token live", а:
```
✅ Token live: [mint]
📣 Launch post published in Square: [preview]
💰 Fee config active: 75% you / 25% platform
🔗 Token page: /token/[mint]
```

---

### P2 — "nice to have" для demo

**13. Creator Profile Skill**
- "Write my bio with Claude" кнопка на Profile

**14. Post Composer Skill**
- "Help me write this" у Feed composer

**15. Wallet connection persistence**
- localStorage для last connected wallet state

**16. Live stats bar на головній**
- "X tokens launched | Y SOL in creator fees | Z community posts"
- Реальні числа з БД + Bags API

---

## Demo Script для відео (3-5 хвилин)

```
0:00 — Головна: показати live stats bar (tokens, fees, posts)
0:30 — Launch Studio: Quick mode → заповнити name/symbol/image
1:00 — AI Assisted: клік "Generate with Claude" → показати draft
1:30 — Preview: показати fee split 75/25
2:00 — Launch: підписати 2-3 txs у Phantom → success screen
2:30 — Auto Launch Post: перейти в Square → пост вже там
3:00 — Token Page: chart + Buy/Sell → зробити swap
3:30 — Fees: показати claimable positions → claim
4:00 — Token Page → AI Analysis tab → "Ask Claude"
4:30 — Docs/README: показати SDK checklist + deployed URL
```

---

## README структура (для суддів)

```markdown
# SignalCred

> The launch-to-community platform for Solana tokens built on Bags.

Launch your token → get a token page → auto-post in community feed
→ trade via Bags → earn creator fees → grow your community.

## Tracks
- **Social Finance**: Token-native social feed, launch posts, tipping
- **Claude Skills**: AI token draft, token analysis, bio generation
- **Fee Sharing**: Auto fee config, creator dashboard, fee leaderboard
- **Bags API**: Full SDK coverage (launch, trade, fees, partner)

## Bags SDK integration
- createTokenInfoAndMetadata ✅
- createBagsFeeShareConfig ✅
- createLaunchTransaction ✅
- trade.getQuote + createSwapTransaction ✅
- fee.getAllClaimablePositions + getClaimTransactions ✅
- partner.getPartnerConfigClaimStats ✅

## Live demo
https://signalcred.vercel.app

## Linked token
[mint address] — SignalCred platform token launched via our own product
```

---

## Ключові диференціатори від кожного конкурента

| Конкурент | Їх сильна сторона | Чому SignalCred інший |
|-----------|-------------------|----------------------|
| BagOS | Deep SDK, MCP server для Claude | CLI-only, no UI, no community. SignalCred — продукт для людей |
| Tend | Fee automation + fraud detection | Складний (Squads vaults). SignalCred — simple creator onboarding |
| BagScan | Discovery terminal | Read-only. SignalCred — launch + community + trade в одному місці |
| TokenSight | Token scoring | Аналітика без дій. SignalCred — аналітика + launch + social |
| Patronage | Membership tiers | Statić gating. SignalCred — dynamic social graph навколо токенів |
| BagsFuel | Auto buyback | Тільки для existing creators. SignalCred — від launch до community |
| Blackhole | Quest platform | Без соцстрічки, holder list замоканий. SignalCred — real social feed |

---

## Головний message для суддів

Більшість проектів цього хакатону вирішують **один** аспект token lifecycle:
- Створити токен
- Проаналізувати токен
- Заробити на fees
- Зробити квест

SignalCred — єдиний проект який вирішує **continuity проблему**: що відбувається з токеном після launch? Де він живе? Хто про нього говорить? Як creator монетизує community навколо нього?

Відповідь: у SignalCred Square.
```

---

*Дата: 2026-04-30 | Версія для The Bags Hackathon submission*
