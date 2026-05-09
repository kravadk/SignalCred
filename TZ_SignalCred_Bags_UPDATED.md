# SignalCred / Bags Square
## Оновлене технічне завдання для The Bags Hackathon

---

## 1. Ідея проекту

**SignalCred / Bags Square** - це платформа, де користувач може:

1. **Створити і реально запустити токен на Solana через Bags**.
2. **Просувати токен у внутрішній соцмережі** у стилі Binance Square / X.
3. **Торгувати запущеними токенами** через Bags trade quote/swap.
4. **У майбутньому додати ф'ючерси на Solana** через інтеграцію з Pacifica, GRVT або іншим перпетуал-провайдером.

Ключова ідея для хакатону: це не просто генератор мем-коїнів і не просто соцстрічка. Це launch-to-community платформа: токен створюється, запускається, одразу отримує сторінку, соціальний граф, пости, трейдинг і аналітику.

---

## 2. Пріоритети MVP

### P0 - обов'язково для хакатону

- Wallet authentication через Privy або Solana wallet adapter.
- Генератор токена: назва, ticker, опис, lore, metadata, logo prompt.
- Реальний launch token через Bags SDK / API v2.
- Partner key / fee sharing для монетизації платформи.
- Сторінка токена після запуску.
- Соцмережа: постинг, лайки, коментарі, профілі, follow.
- Автоматичний Launch Post після створення токена.
- Buy / Sell токена через Bags trade quote + swap.
- Дані ціни і chart через Birdeye.
- Public demo, README, demo video, submission на DoraHacks.

### P1 - бажано

- Launch intent URL для шарингу ще до повного запуску.
- Claim creator fees і partner fees у кабінеті.
- Trending алгоритм для токенів і постів.
- Token analytics: lifetime fees, creators, claim events.
- File upload для лого/медіа за правилами Bags.
- Бейджі профілю: launches, viral token, fee earner.

### P2 - остання черга

- Futures tab на Solana.
- Інтеграція з Pacifica / GRVT / іншим perp-протоколом.
- Позиції, funding, leverage, liquidation UI.
- Обмеження ризику, read-only demo mode, compliance copy.

---

## 3. Hackathon Context

- Hackathon: The Bags Hackathon
- Registration: https://bags.fm/hackathon
- DoraHacks: https://dorahacks.io/hackathon/the-bags-hackathon/detail
- Developer portal: https://dev.bags.fm
- Docs: https://docs.bags.fm
- API reference: https://docs.bags.fm/api-reference/introduction
- Support: https://support.bags.fm

Важливо: проект має мати linked token. Для submission потрібно запустити власний токен SignalCred через Bags і показати, що запуск токенів є центральною інтеграцією продукту.

---

## 4. Bags Integration

### Base API

За документацією Bags API v2:

```txt
Base URL: https://public-api-v2.bags.fm/api/v1/
Auth: x-api-key: BAGS_API_KEY
Response: { success: boolean, response?: object, error?: string }
Public keys: Base58 Solana public keys
```

### SDK

```bash
npm install @bagsfm/bags-sdk @solana/web3.js bs58
```

```ts
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection } from "@solana/web3.js";

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const sdk = new BagsSDK(process.env.BAGS_API_KEY!, connection, "processed");
```

### Token launch flow

Основний production flow:

1. Підготувати metadata: name, symbol, description, imageUrl, links.
2. Викликати `sdk.tokenLaunch.createTokenInfoAndMetadata()`.
3. Створити або знайти fee share config.
4. Викликати `sdk.tokenLaunch.createLaunchTransaction()`.
5. Підписати transaction wallet/keypair.
6. Відправити transaction або bundle.
7. Зберегти mint, launch id, creator wallet, metadata, launch status.
8. Автоматично створити Launch Post у соцстрічці.

Для demo MVP приватний ключ не зберігати на клієнті. У продакшн-версії користувач має підписувати транзакції своїм wallet adapter. Server-side private key можна використовувати тільки для controlled demo або internal launch token.

### Fee sharing

Платформа має використовувати fee sharing:

- creator отримує основну частину fee;
- SignalCred отримує partner/platform share;
- опціонально можна додати co-creator/KOL fee claimers;
- partner key створюється через Bags Developer Portal / API.

### Trading

Для spot trading токенів:

1. `sdk.trade.getQuote()`
2. показати out amount, min out amount, price impact, slippage, route plan;
3. `sdk.trade.createSwapTransaction()`;
4. wallet підписує transaction;
5. зберегти trade event у activity feed.

---

## 5. Product Modules

### 5.1 Launch Studio

Це головний екран MVP.

Функції:

- Connect wallet.
- Вибір режиму: Quick Launch / AI Assisted / Advanced.
- Поля token metadata:
  - name;
  - symbol;
  - description;
  - image upload або generated logo;
  - website/X/Telegram;
  - initial buy amount;
  - fee mode;
  - partner config.
- AI assistant генерує:
  - опис;
  - lore;
  - launch post;
  - short pitch для X;
  - suggested token tags;
  - risk checklist.
- Preview перед запуском.
- Create launch transaction.
- Status tracker: metadata created, config created, tx signed, token live.

### 5.2 Social Feed

Соцмережа у стилі Binance Square / X, але заточена під токени.

Функції:

- Головна стрічка.
- Tabs: Trending, New, Following, Launches.
- Composer для постів.
- Типи постів:
  - Launch Post;
  - Update;
  - Analysis;
  - Meme;
  - Trade idea.
- Like, comment, repost/share.
- Token cashtag links: `$TICKER`.
- Wallet/profile links.
- Медіа вкладення.
- Модерація мінімум: report, hide, spam score.

### 5.3 Token Page

Кожен token mint отримує окрему сторінку.

Функції:

- Token header: logo, name, symbol, creator, mint.
- Price, market cap, 24h volume, holders.
- Chart 24h / 7d / 30d через Birdeye.
- Buy / Sell panel через Bags trade.
- Launch metadata і whitepaper.
- Fee stats: lifetime fees, claimable fees, partner stats.
- Social tab: всі пости про токен.
- Holders/community tab.
- Creator tools: post update, claim fees, edit social links.

### 5.4 Creator Profile

Функції:

- Wallet identity.
- Username, avatar, bio.
- Follow/following.
- Запущені токени.
- Total market cap launched.
- Fees earned.
- Posts.
- Badges.

### 5.5 Partner / Fees Dashboard

Функції:

- Partner stats.
- Claim partner fees.
- Claim creator fees.
- Lifetime fees per token.
- Claim events history.
- Fee split explanation.

### 5.6 Futures - later stage

Це не MVP, а окрема вкладка з disabled/demo станом.

Майбутні функції:

- SOL perps або token perps через Pacifica / GRVT / інший провайдер.
- Leverage selector.
- Long / Short.
- Funding, open interest, liquidation price.
- Risk warning.
- Для хакатону достатньо показати placeholder UI і roadmap.

---

## 6. Backend API

```txt
POST /api/auth/session
GET  /api/me

POST /api/ai/token-draft
POST /api/tokens/metadata
POST /api/tokens/launch
GET  /api/tokens/:mint
GET  /api/tokens/:mint/chart
GET  /api/tokens/:mint/fees
GET  /api/tokens/:mint/social

GET  /api/trade/quote
POST /api/trade/swap

POST /api/posts
GET  /api/posts
GET  /api/posts/:id
POST /api/posts/:id/like
POST /api/posts/:id/comment
POST /api/posts/:id/repost

GET  /api/profiles/:wallet
POST /api/profiles/:wallet/follow

GET  /api/trending/tokens
GET  /api/trending/posts

GET  /api/fees/partner
POST /api/fees/partner/claim
POST /api/fees/token/:mint/claim
```

---

## 7. Database Schema

```sql
CREATE TABLE users (
  wallet VARCHAR(44) PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tokens (
  mint VARCHAR(44) PRIMARY KEY,
  creator_wallet VARCHAR(44) REFERENCES users(wallet),
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(12) NOT NULL,
  description TEXT,
  image_url TEXT,
  website_url TEXT,
  twitter_url TEXT,
  telegram_url TEXT,
  bags_launch_id TEXT,
  partner_config TEXT,
  launch_status VARCHAR(20) DEFAULT 'draft',
  initial_buy_lamports BIGINT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  launched_at TIMESTAMP
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_wallet VARCHAR(44) REFERENCES users(wallet),
  token_mint VARCHAR(44) REFERENCES tokens(mint),
  post_type VARCHAR(24) NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  author_wallet VARCHAR(44) REFERENCES users(wallet),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE likes (
  post_id UUID REFERENCES posts(id),
  wallet VARCHAR(44) REFERENCES users(wallet),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (post_id, wallet)
);

CREATE TABLE follows (
  follower VARCHAR(44) REFERENCES users(wallet),
  following VARCHAR(44) REFERENCES users(wallet),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower, following)
);

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(44) REFERENCES users(wallet),
  input_mint VARCHAR(44),
  output_mint VARCHAR(44),
  in_amount TEXT,
  out_amount TEXT,
  price_impact_pct TEXT,
  tx_signature TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fee_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_mint VARCHAR(44) REFERENCES tokens(mint),
  wallet VARCHAR(44),
  event_type VARCHAR(32),
  amount_lamports BIGINT,
  tx_signature TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 8. Environment Variables

```env
BAGS_API_KEY=
BAGS_PARTNER_KEY=
BAGS_PARTNER_CONFIG=
SOLANA_RPC_URL=
PRIVATE_KEY=
BIRDEYE_API_KEY=
DATABASE_URL=
PRIVY_APP_ID=
PRIVY_APP_SECRET=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## 9. External Services

- Bags API / SDK: token launch, fee sharing, trade quote/swap.
- Helius: Solana RPC.
- Birdeye: token price, chart, market data.
- Meteora: liquidity context.
- Privy: wallet auth.
- DFlow: optional DEX routing/reference.
- Pacifica / GRVT: futures stage, not MVP.

---

## 10. Frontend Tabs

Базовий прототип має показувати такі вкладки:

1. **Launch** - створення токена і запуск через Bags.
2. **Square** - соцстрічка.
3. **Token** - сторінка токена з chart і Buy/Sell.
4. **Fees** - partner/creator fee dashboard.
5. **Profile** - профіль creator/trader.
6. **Futures** - disabled або demo roadmap вкладка.
7. **Docs** - чеклист інтеграцій і посилання.

Дизайн має бути ближче до trading/social terminal, а не до landing page: щільний, швидкий для сканування, з лівою навігацією, центральною стрічкою, правою панеллю live token data.

---

## 11. Acceptance Criteria

- Користувач бачить launch flow від draft до live token.
- Після launch автоматично створюється token page і launch post.
- Token page має Buy/Sell flow хоча б у mock/demo режимі.
- Social feed має базові interaction states.
- Є partner fee / creator fee roadmap або робочий read-only dashboard.
- В README описано Bags endpoints, keys, demo flow.
- Відео показує: connect wallet, create token, launch, post, buy/sell, fees.

---

## 12. Основні джерела

- https://docs.bags.fm/api-reference/introduction
- https://docs.bags.fm/how-to-guides/launch-token
- https://docs.bags.fm/how-to-guides/trade-tokens
- https://docs.bags.fm/how-to-guides/create-partner-key
- https://docs.bags.fm/how-to-guides/claim-partner-fees
- https://docs.bags.fm/how-to-guides/claim-fees
- https://docs.bags.fm/how-to-guides/get-token-lifetime-fees
- https://docs.bags.fm/how-to-guides/get-token-creators
- https://docs.bags.fm/how-to-guides/get-token-claim-events
- https://docs.bags.fm/how-to-guides/customize-token-fees
- https://docs.bags.fm/how-to-guides/agent-authentication
- https://docs.bags.fm/how-to-guides/incorporate-token
- https://docs.bags.fm/how-to-guides/create-launch-intent
- https://docs.bags.fm/how-to-guides/initial-buy-math
- https://docs.bags.fm/principles/base-url-versioning
- https://docs.bags.fm/principles/error-handling
- https://docs.bags.fm/principles/rate-limits
- https://docs.bags.fm/principles/file-uploads
- https://docs.bags.fm/principles/tipping
- https://docs.bags.fm/principles/lookup-tables
