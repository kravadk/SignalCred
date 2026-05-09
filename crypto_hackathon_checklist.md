# Чекліст крипто-проєкту перед подачею на хакатон

## Інструкція для нейронки / AI-асистента

Перед використанням цього чекліста спочатку самостійно проаналізуй конкретний крипто-проєкт:

- що це за продукт;
- для кого він;
- який головний user flow;
- які блокчейни, протоколи, SDK, API, storage, oracle або smart contracts використовуються;
- що саме є Web3-цінністю;
- де зберігаються дані;
- які є транзакції;
- які можуть бути баги, абузи, edge cases;
- які вимоги має конкретний хакатон і трек.

Після цього адаптуй список під проєкт: прибери нерелевантне, додай специфічні перевірки для конкретної архітектури, треку і технологій. Не використовуй чекліст механічно. Для кожного пункту бажано вказати статус:

- ✅ готово;
- ⚠️ частково;
- ❌ не зроблено;
- 🧪 треба протестити;
- 📝 треба пояснити в README / demo video.

Головна мета: перевірити, чи проєкт виглядає як завершений MVP, який суддя може швидко зрозуміти, запустити, протестити і оцінити.

---

# 1. Проблема і цінність продукту

Перед подачею має бути зрозуміло, яку проблему вирішує проєкт.

Перевірити:

- є конкретна проблема, а не просто “ми зробили Web3 app”;
- зрозуміло, хто користувач;
- зрозуміло, чому користувачу це потрібно;
- є конкретний результат після використання продукту;
- є причина, чому тут потрібен blockchain/Web3;
- продукт не виглядає як технічна демка без сенсу для юзера.

Приклади хорошого формулювання:

- “Користувач проходить on-chain місії і отримує reputation score, який можна використати в інших комʼюніті.”
- “Гра зберігає прогрес у decentralized storage, щоб дані гравця не залежали від одного сервера.”
- “DePIN-користувач надсилає дані, система їх перевіряє і створює proof участі.”

Погано:

- “Ми зробили decentralized platform.”
- “Ми використали smart contract.”
- “Це Web3 social app.”

---

# 2. Core concept / основна ідея

Проєкт має мати одну зрозумілу центральну ідею.

Перевірити:

- ідею можна пояснити в 1–2 реченнях;
- фічі не розкидані хаотично;
- зрозуміло, що є головною дією користувача;
- зрозуміло, чому це підходить під хакатон;
- продукт можна масштабувати після хакатону.

Формула:

> Ми робимо X для Y, щоб вони могли Z, використовуючи protocol/tech, який дає конкретну перевагу.

Приклад:

> Ми робимо SocialFi-гру для крипто-комʼюніті, де користувачі виконують on-chain місії, зберігають прогрес у decentralized storage і будують reputation, який можна використовувати в інших додатках.

---

# 3. Основний user flow

Має працювати повний шлях користувача від входу до результату.

Базовий flow:

1. Користувач відкриває app.
2. Підключає wallet.
3. Бачить свій профіль / баланс / статус.
4. Обирає або виконує дію.
5. Підписує message або транзакцію.
6. Дані обробляються.
7. Результат зберігається.
8. UI оновлюється.
9. Користувач бачить підтвердження.
10. Після refresh результат не зникає.

Перевірити:

- flow проходиться без ручного втручання розробника;
- немає кроків, які “треба знати самому”;
- немає кнопок, які нічого не роблять;
- немає ситуації, де user не розуміє, що сталося;
- після дії видно результат.

---

# 4. Wallet interaction

Wallet — один з головних елементів крипто-проєкту.

Перевірити:

- підключення wallet працює;
- disconnect працює;
- після refresh стан wallet обробляється нормально;
- зміна акаунта не ламає app;
- зміна мережі не ламає app;
- неправильна мережа показує зрозуміле повідомлення;
- є кнопка switch network, якщо потрібно;
- адреса користувача відображається скорочено;
- баланс / assets / profile підтягуються для поточного wallet;
- якщо wallet не встановлений, є зрозуміле повідомлення;
- якщо користувач відхиляє підпис, app не зависає;
- якщо користувач відхиляє транзакцію, app повертається в нормальний стан.

Edge cases:

- користувач має 0 native token для gas;
- користувач підключив не той wallet;
- користувач відкрив app в мобільному браузері;
- wallet завис у pending;
- wallet не підтримує потрібну мережу.

---

# 5. Smart contracts

Якщо є smart contracts, вони мають бути перевірені окремо.

Перевірити:

- контракт задеплоєний у правильну мережу;
- frontend використовує правильну адресу контракту;
- ABI актуальний;
- основні функції працюють;
- access control налаштований;
- admin-функції не доступні звичайним користувачам;
- є require/revert на неправильні дії;
- не можна зробити подвійний claim/mint/vote/submit;
- події emit-яться;
- після транзакції стан контракту реально змінюється;
- contract address є в README;
- explorer link відкривається;
- контракт verified, якщо є час.

Приклади перевірок:

- не можна claim reward двічі;
- не можна mint без виконаної умови;
- не можна голосувати чужим wallet;
- не можна викликати admin function без ролі;
- не можна передати пустий або неправильний input;
- не можна отримати reward, якщо транзакція failed.

---

# 6. Транзакції

Кожна транзакція має мати зрозумілий життєвий цикл.

Перевірити:

- транзакція створюється;
- wallet відкриває підтвердження;
- user може reject без поломки app;
- pending state показується;
- success state показується;
- failed state показується;
- після success UI оновлюється;
- після failed дані не змінюються як успішні;
- є block explorer link;
- кнопка блокується під час pending;
- повторний клік не створює дубль;
- gas fee врахований;
- транзакція не запускається з неправильними даними.

Питання для перевірки:

- що буде, якщо user натисне кнопку 5 разів?
- що буде, якщо user reject?
- що буде, якщо transaction pending 2 хвилини?
- що буде, якщо RPC не відповідає?
- що буде, якщо user refresh під час pending?

---

# 7. Дані: отримання, обробка, надсилання

Проєкт має чітко працювати з даними.

Перевірити:

- frontend правильно читає дані з контракту/API/storage;
- backend, якщо є, повертає правильний формат;
- дані не дублюються;
- дані не губляться після refresh;
- неправильні дані не ламають app;
- є loading state;
- є empty state;
- є error state;
- після транзакції дані оновлюються;
- кеш не показує старі дані як нові;
- є зрозумілий source of truth.

Потрібно розуміти:

| Тип даних | Де зберігається | Навіщо |
|---|---|---|
| Wallet address | wallet / contract | ідентифікація |
| Профіль | database / storage / contract | user identity |
| Game score | backend + proof / contract | результат гри |
| Metadata | decentralized storage | доступність даних |
| Claim status | smart contract | захист від дубля |
| UI state | frontend | тимчасовий стан |

---

# 8. Backend / API

Якщо є backend, він не має бути слабким місцем.

Перевірити:

- endpoints працюють;
- є validation input;
- неправильний body не ламає server;
- API не приймає fake wallet address без signature;
- API не віддає чужі дані;
- API не створює дублікати;
- база не приймає сміття;
- є базова обробка помилок;
- є CORS налаштування;
- production API працює;
- немає secret keys у коді;
- `.env` не залитий у GitHub;
- є `.env.example`.

Приклади проблем:

- frontend відправляє `wallet: 0x...`, а backend вірить без підпису;
- user може через DevTools змінити reward amount;
- API створює 5 записів при 5 кліках;
- API падає від пустого body;
- API повертає stack trace користувачу.

---

# 9. Anti-abuse логіка

Особливо важливо для rewards, points, NFT, quests, leaderboard, SocialFi, GameFi, DePIN.

## 9.1 Повторна дія

Потенційний абуз:

- claim reward 10 разів;
- mint NFT 10 разів;
- submit quest 10 разів;
- повторити той самий proof;
- оновити сторінку і повторити reward.

Захист:

- `hasClaimed[address]`;
- unique quest ID;
- nonce;
- cooldown;
- one action per wallet;
- перевірка transaction hash;
- перевірка timestamp;
- contract-level validation;
- server-side validation.

## 9.2 Multi-click

Потенційний абуз:

- user швидко натискає кнопку багато разів;
- створюється кілька транзакцій;
- створюється кілька API-записів;
- UI показує кілька rewards.

Захист:

- disable button while loading/pending;
- debounce;
- pending lock;
- backend duplicate check;
- contract duplicate check;
- idempotency key.

## 9.3 Fake wallet data

Поганий варіант:

```json
{
  "wallet": "0x чужа адреса",
  "reward": 1000
}
```

Краще:

- user підписує message;
- backend перевіряє signature;
- signer address має збігатися з wallet;
- smart contract використовує `msg.sender`;
- reward amount не приходить з frontend без перевірки.

## 9.4 Fake game score

Потенційний абуз:

- user через DevTools ставить score 999999;
- user відправляє неможливий результат;
- user повторює старий proof.

Захист:

- max score per session;
- min/max time limits;
- session ID;
- server-side validation;
- proof/hash результату;
- перевірка неможливих значень;
- cooldown between submissions;
- suspicious score flag.

## 9.5 Sybil attack

Потенційний абуз:

- user створює 100 wallet-ів;
- фармить rewards;
- накручує leaderboard;
- отримує багато NFT.

Базовий захист для MVP:

- cooldown;
- wallet age/activity check;
- allowlist;
- proof of human;
- staking requirement;
- reputation requirement;
- social proof;
- обмеження на session/device/IP, якщо є backend;
- складніші quests, які не проходяться масово за 5 секунд.

## 9.6 Leaderboard abuse

Перевірити:

- score не приймається без перевірки;
- negative score не приймається;
- huge score не приймається;
- один proof не можна використати двічі;
- leaderboard не оновлюється fake-запитом;
- old score не перезаписує new score неправильно;
- suspicious users можна відфільтрувати.

## 9.7 Reward abuse

Перевірити:

- reward видається тільки після виконаної умови;
- reward не видається до transaction confirmation;
- failed transaction не показує success;
- reward amount не можна змінити з frontend;
- one claim per wallet / per quest;
- повторний refresh не видає reward ще раз.

---

# 10. Frontend якість

Frontend має виглядати як завершене MVP, а не чернетка.

Перевірити:

- всі кнопки працюють;
- немає битих сторінок;
- немає пустих блоків;
- немає console errors;
- UI адаптивний;
- довгі wallet-адреси не ламають layout;
- loading/error/success стани є;
- форма не відправляється з пустими даними;
- кнопки disabled під час pending;
- тексти зрозумілі;
- немає debug-сміття;
- немає lorem ipsum;
- немає “coming soon” на головному flow.

---

# 11. UX для суддів

Суддя має швидко зрозуміти, що робити.

## 11.1 Перший екран

На першому екрані має бути:

- назва продукту;
- короткий опис;
- головна кнопка;
- для кого продукт;
- який результат отримає user;
- яка Web3-логіка використовується.

Погано:

> Decentralized AI-powered scalable protocol for Web3 interactions.

Краще:

> Гра, де гравець виконує on-chain місії, зберігає прогрес у decentralized storage і отримує reputation score.

## 11.2 Один головний сценарій

Краще мати один завершений flow, ніж 10 сирих фіч.

Приклад:

> Connect wallet → create profile → complete mission → verify action → save result → show score/reward.

## 11.3 Demo mode

Бажано мати:

- demo user;
- prefilled дані;
- sample quest;
- sample game session;
- test action;
- короткі підказки.

Кнопки:

- Try Demo;
- Start Mission;
- Create Test Profile;
- Generate Sample Quest;
- Simulate Data;
- Submit Result;
- Verify Proof.

## 11.4 Пояснення прямо в UI

У продукті мають бути короткі підказки:

- “This action writes your score on-chain.”
- “This stores your game state in decentralized storage.”
- “This verifies wallet ownership.”
- “This prevents duplicate claims.”
- “This fetches live market data.”

## 11.5 How to test in 2 minutes

Дуже корисний блок для суддів:

1. Connect wallet.
2. Switch to testnet.
3. Click Start Mission.
4. Submit result.
5. Confirm transaction.
6. See updated score.
7. Open explorer/storage link.

## 11.6 UX states

Обовʼязково перевірити:

- no wallet;
- wrong network;
- loading;
- pending;
- success;
- failed;
- rejected;
- empty state;
- no data;
- insufficient gas;
- backend error.

---

# 12. Інтеграція з треком / протоколом

Це один із найважливіших пунктів для хакатону.

## 12.1 Погана інтеграція

Погано, якщо команда:

- просто додала логотип протоколу;
- просто задеплоїла контракт у потрібній мережі;
- просто використала SDK один раз;
- просто написала “powered by X”;
- не пояснила, навіщо саме цей протокол;
- могла зробити те саме без Web3.

## 12.2 Хороша інтеграція

Протокол має виконувати реальну роль:

- зберігати важливі дані;
- підтверджувати дію;
- давати ownership;
- забезпечувати payments/rewards;
- давати identity/reputation;
- масштабувати storage/computation;
- робити результат verifiable;
- прибирати залежність від централізованого backend.

## 12.3 Якщо трек про decentralized storage

Можна зберігати:

- game state;
- user profile;
- quest history;
- NFT metadata;
- AI-generated content;
- DePIN measurements;
- social graph;
- reputation history;
- proof of contribution;
- match results;
- creator content;
- documents/certificates.

Погано:

> Ми зберігаємо картинку в storage.

Краще:

> Ми зберігаємо game state, історію місій і proof виконання у decentralized storage, щоб прогрес користувача не залежав від нашого сервера.

## 12.4 Якщо трек про DeFi

Можна інтегрувати:

- swap;
- staking;
- lending;
- vault;
- yield strategy;
- portfolio tracker;
- risk score;
- liquidation alerts;
- futures/perps;
- auto-hedging;
- collateral mechanics;
- reward based on trading behavior.

Краще не просто “кнопка swap”, а:

> Користувач виконує ігрову місію, де результат залежить від реального on-chain portfolio/risk behavior.

## 12.5 Якщо трек про SocialFi

Можна інтегрувати:

- on-chain profile;
- reputation;
- contribution proof;
- follower graph;
- gated communities;
- creator rewards;
- referral system;
- community voting;
- quests;
- access based on activity.

Приклад:

> Користувач створює contribution proof, який впливає на reputation і відкриває доступ до наступних можливостей.

## 12.6 Якщо трек про GameFi

Можна інтегрувати:

- NFT персонажі;
- inventory;
- quest completion;
- battle results;
- player ranking;
- crafting;
- marketplace;
- guilds/clans;
- seasonal rewards;
- interoperable items;
- match history.

Приклад:

> Гравець проходить місії, а прогрес і предмети зберігаються так, щоб їх можна було використати в інших сезонах або режимах.

## 12.7 Якщо трек про AI + Web3

Можна інтегрувати:

- AI-generated quests;
- AI NPC;
- AI risk analysis;
- AI portfolio suggestions;
- AI moderation;
- AI content generation;
- AI strategy agent;
- Web3 proof/history/storage для результатів.

Приклад:

> AI генерує персональні місії, а результат виконання записується on-chain або в decentralized storage.

## 12.8 Якщо трек про DePIN

Можна інтегрувати:

- збір даних з device/sensor;
- симуляцію data points для MVP;
- proof of location/activity;
- rewards за валідні дані;
- reputation node/operator;
- перевірку fake data;
- dashboard measurements;
- decentralized storage для історії measurements.

## 12.9 Якщо трек про privacy / identity

Можна інтегрувати:

- proof of ownership;
- proof of participation;
- proof of age без розкриття даних;
- anonymous voting;
- private reputation;
- gated access;
- anti-sybil checks;
- selective disclosure.

## 12.10 Як показати інтеграцію суддям

У README / pitch / demo має бути блок:

- What we use: SDK / API / smart contract / storage / oracle.
- Where we use it: profile / quest / score / proof / storage / payment.
- Why it matters: cheaper / faster / decentralized / verifiable / scalable.
- Proof: contract address / explorer link / tx hash / storage link.

---

# 13. Тестування

Тестування треба ділити на сценарії.

## 13.1 Happy path

Перевірити ідеальний сценарій:

- app відкривається;
- wallet підключається;
- правильна мережа;
- user виконує основну дію;
- transaction/message signing працює;
- success показується;
- дані оновлюються;
- результат видно після refresh.

## 13.2 Wallet test cases

Перевірити:

- wallet не встановлений;
- wallet підключений;
- wallet відключений;
- user змінив акаунт;
- user змінив network;
- user rejected signature;
- user rejected transaction;
- wallet pending;
- user має 0 balance;
- user має insufficient gas;
- user refresh під час pending.

## 13.3 Network test cases

Перевірити:

- правильна мережа;
- неправильна мережа;
- automatic switch network;
- switch network failed;
- RPC не відповідає;
- contract не знайдений;
- explorer link неправильний;
- frontend показує стару адресу контракту.

## 13.4 Smart contract test cases

Перевірити:

- правильний виклик функції;
- неправильний input;
- повторний claim;
- виклик чужої дії;
- виклик без ролі;
- нульові значення;
- дуже великі значення;
- min/max значення;
- events emit;
- state update після transaction.

## 13.5 Backend/API test cases

Перевірити:

- правильний request;
- пустий body;
- неправильний wallet address;
- fake wallet address;
- duplicate request;
- database error;
- rate limit/spam;
- API не віддає чужі дані;
- API не зберігає сміття;
- production endpoint працює.

## 13.6 Frontend test cases

Перевірити:

- buttons disabled during loading;
- no double submit;
- error message зрозумілий;
- mobile view;
- long wallet address;
- empty state;
- loading не зависає;
- немає console errors;
- немає broken images;
- refresh не ламає стан.

## 13.7 Demo test cases

Окремо перевірити те, що бачить суддя:

- live demo відкривається;
- README інструкція працює;
- demo video відповідає реальному продукту;
- contract address правильний;
- testnet faucet згаданий, якщо потрібен;
- немає localhost;
- немає старих links;
- немає кнопок, які не працюють.

---

# 14. Документація / README

README має бути простим і корисним.

Структура:

```md
# Project Name

## Problem
Що болить.

## Solution
Що ми зробили.

## How it works
Короткий user flow.

## Protocol integration
Де використали технологію хакатону.

## Features
Що вже працює.

## Tech stack
Frontend, backend, smart contracts, storage, APIs.

## Smart contracts
Network, addresses, explorer links.

## Demo
Live link + video.

## How to run
Команди запуску.

## Future plans
Що буде далі.
```

Перевірити:

- є live link;
- є demo video;
- є contract addresses;
- є інструкція запуску;
- є `.env.example`;
- описана інтеграція з протоколом;
- описано, що вже працює;
- описано, що буде далі;
- немає застарілої інформації.

---

# 15. Demo video

Відео має показувати продукт, а не тільки розмову.

Структура:

1. 10–15 секунд — проблема.
2. 15–25 секунд — що це за продукт.
3. 60–90 секунд — live demo.
4. 30 секунд — Web3/protocol integration.
5. 15 секунд — чому це може стати більшим продуктом.

Перевірити:

- видно головний user flow;
- видно wallet interaction;
- видно transaction або signing;
- видно результат;
- видно інтеграцію з протоколом;
- немає довгої теорії без демонстрації;
- відео не занадто довге;
- звук/текст зрозумілі.

---

# 16. GitHub репозиторій

Перед submit перевірити:

- repo публічний або доступний суддям;
- README нормальний;
- код запускається;
- немає `.env`;
- є `.env.example`;
- немає private keys;
- немає зайвого сміття;
- назви файлів зрозумілі;
- commit history не виглядає хаотично;
- є license, якщо потрібно;
- links на demo/video/explorer працюють;
- немає старих contract addresses.

---

# 17. Deployment

Перевірити:

- сайт відкривається;
- production build проходить;
- всі env додані;
- API працює в production;
- contracts addresses правильні;
- CORS не ламає запити;
- mobile працює;
- refresh не дає 404;
- images/assets завантажуються;
- немає localhost links;
- немає debug banners;
- домен/URL нормальний для submit.

---

# 18. Bug prevention

Це блок “що може піти не так”.

## 18.1 Подвійні кліки

Питання:

> Що буде, якщо user натисне кнопку 5 разів?

Має бути:

- кнопка блокується;
- створюється одна транзакція;
- backend не створює дублікати;
- UI не дублює reward/result.

## 18.2 Відмова від транзакції

Питання:

> Що буде, якщо user натиснув Reject?

Має бути:

- loading зникає;
- кнопка знову активна;
- дані не змінюються;
- reward не видається;
- є зрозуміле повідомлення.

## 18.3 Pending завис

Питання:

> Що буде, якщо transaction pending дуже довго?

Має бути:

- pending status;
- explorer link;
- можливість retry/check status;
- UI не зависає назавжди.

## 18.4 Wrong network

Питання:

> Що буде, якщо user у неправильній мережі?

Має бути:

- повідомлення;
- switch network;
- основна дія заблокована;
- transaction не йде в неправильний contract.

## 18.5 API down

Питання:

> Що буде, якщо backend не відповідає?

Має бути:

- error message;
- retry;
- fallback, якщо можливо;
- app не падає повністю.

## 18.6 Старі дані

Питання:

> Що буде, якщо UI показує кешовані дані?

Має бути:

- refetch після transaction;
- invalidate cache;
- loading state;
- last updated timestamp, якщо потрібно.

## 18.7 Refresh page

Питання:

> Що буде після refresh?

Має бути:

- wallet state обробляється;
- user data підтягується;
- результат не зникає;
- pending не створює дубль.

## 18.8 Порожні дані

Питання:

> Що буде, якщо user ще не має профілю/історії/місій?

Має бути empty state:

> “You don’t have missions yet. Start your first mission.”

А не порожній білий блок.

## 18.9 Поганий input

Перевірити:

- пусте поле;
- дуже довгий username;
- emoji;
- спецсимволи;
- пробіли;
- неправильний wallet address;
- negative number;
- дуже велике число;
- неправильний формат data.

## 18.10 Security edge cases

Перевірити:

- чи можна через DevTools змінити reward;
- чи можна підставити чужу адресу;
- чи можна обійти completed quest;
- чи можна викликати admin action;
- чи можна повторити старий proof;
- чи можна зробити replay attack;
- чи можна напряму викликати API і отримати reward.

---

# 19. Security basics

Перевірити:

- private keys не в коді;
- `.env` не в GitHub;
- admin functions захищені;
- user не може діяти від чужої адреси;
- backend перевіряє signature, якщо треба;
- frontend не є source of truth для reward/score;
- smart contract має validation;
- API не віддає секрети;
- dependencies без очевидних проблем;
- немає hardcoded secret tokens;
- CORS не відкритий небезпечно без потреби.

---

# 20. Error handling

Для кожної важливої дії має бути:

- success message;
- error message;
- pending state;
- rejected state;
- empty state;
- no wallet state;
- wrong network state;
- insufficient funds state;
- backend error state;
- retry action.

Погано:

- кнопка нічого не робить;
- loading крутиться вічно;
- помилка тільки в console;
- user не розуміє, чи дія виконалась.

---

# 21. Product clarity

Перед submit треба мати відповіді:

- що це?
- для кого?
- яку проблему вирішує?
- чому Web3?
- чому цей протокол?
- чому це краще за звичайний Web2 app?
- який результат отримує user?
- чому user повернеться?

---

# 22. Core loop

Особливо для ігор, SocialFi, DePIN, rewards.

Приклади core loop:

- complete quest → earn score → unlock next quest;
- submit data → get verification → improve reputation;
- play match → save result → climb leaderboard;
- create content → get proof → receive reward;
- stake asset → unlock advantage → use in battle;
- invite user → build social graph → unlock community access.

Перевірити:

- є повторювана дія;
- user має мотивацію повернутись;
- прогрес видно;
- reward/score/reputation не виглядає випадковим;
- loop повʼязаний із Web3-логікою.

---

# 23. Data architecture

Треба розуміти архітектуру даних.

Перевірити:

- що on-chain;
- що off-chain;
- що в decentralized storage;
- що в database;
- що тільки в frontend;
- що є source of truth;
- як дані відновлюються після refresh;
- що станеться, якщо backend недоступний;
- що станеться, якщо storage link недоступний.

---

# 24. Observability / logs

Навіть для MVP корисно мати базові logs.

Перевірити:

- немає червоних console errors;
- backend logs зрозумілі;
- transaction errors логуються;
- API errors видно;
- можна швидко знайти, де впало;
- є зрозумілі messages для user;
- немає зайвих debug logs у production.

---

# 25. Contract addresses і network config

Перевірити:

- правильна мережа;
- правильні contract addresses;
- ABI актуальний;
- explorer links відкриваються;
- README містить адреси;
- frontend не використовує старі адреси;
- testnet/mainnet не переплутані;
- chain ID правильний;
- RPC URL працює.

---

# 26. Environment variables

Перевірити:

- `.env.example` є;
- `.env` не залитий;
- всі required variables описані;
- production env додані;
- secret keys не в frontend;
- API keys не публічні, якщо вони secret;
- build не падає через missing env;
- README пояснює, як заповнити env.

---

# 27. Build & local run

Перевірити:

- `npm install` / `pnpm install` працює;
- `npm run dev` працює;
- `npm run build` працює;
- smart contract deploy script працює, якщо є;
- migrations/scripts не зламані;
- README команди актуальні;
- новий user може запустити без ваших пояснень у Telegram/Discord.

---

# 28. Pitch для суддів

Потрібен короткий і сильний pitch.

Структура:

1. Проблема.
2. Рішення.
3. Для кого.
4. Як працює.
5. Де Web3.
6. Де інтеграція з протоколом.
7. Чому це може стати більшим продуктом.

Приклад:

> Багато крипто-комʼюніті не мають нормального способу відрізняти реальних активних учасників від фармерів. Ми робимо SocialFi quest game, де користувачі виконують перевірені місії, отримують reputation score, а proof прогресу зберігається через Web3-інфраструктуру.

---

# 29. Технічна чесність

Не перебільшувати.

Не казати:

- “fully decentralized”, якщо backend усе контролює;
- “AI-powered”, якщо AI майже не використовується;
- “on-chain game”, якщо on-chain тільки login;
- “DePIN”, якщо немає data flow;
- “production-ready”, якщо це MVP.

Краще:

> MVP demonstrates the core flow: wallet-based identity, mission completion, decentralized result storage, and basic anti-duplicate reward logic.

---

# 30. Future plans

Плани мають бути логічним продовженням MVP.

Приклади:

- більше quest types;
- кращий anti-sybil;
- mobile app;
- marketplace;
- DAO voting;
- advanced reputation;
- integrations with more protocols;
- mainnet deployment;
- analytics dashboard;
- creator tools;
- guild/clan mechanics.

Погано:

- “зробимо все”;
- “AI, DAO, NFT, metaverse, DePIN, SocialFi” без конкретики.

---

# 31. Хакатон submission form

Перед відправкою перевірити:

- назва проєкту правильна;
- опис короткий і зрозумілий;
- GitHub link працює;
- live demo link працює;
- video link працює;
- вибраний правильний трек;
- команда вказана;
- contract addresses вказані, якщо потрібно;
- використані технології описані;
- немає помилок у формах;
- немає приватних links.

---

# 32. Мінімальний must-have перед submit

Якщо часу мало, обовʼязково має бути:

- live demo;
- GitHub;
- README;
- demo video;
- wallet connect;
- основний user flow;
- реальна Web3/protocol integration;
- success/error states;
- захист від повторного claim/submit, якщо є rewards;
- нормальний first screen;
- contract/API/storage links;
- відсутність секретів у repo.

---

# 33. Фінальна перевірка за 15 хвилин

Перед submit швидко пройти:

- чи відкривається live demo?
- чи працює connect wallet?
- чи правильна мережа?
- чи проходиться головний flow?
- чи видно результат?
- чи працює після refresh?
- чи немає console errors?
- чи README актуальний?
- чи video відкривається?
- чи GitHub публічний?
- чи немає `.env`?
- чи contract addresses правильні?
- чи немає localhost links?
- чи суддя зрозуміє продукт за 1 хвилину?

---

# 34. Найголовніша логіка оцінки

Проєкт має показувати ланцюг:

> проблема → дія користувача → Web3/protocol logic → обробка даних → результат → захист від багів/абузу → зрозуміле demo.

Якщо цей ланцюг видно, навіть MVP виглядає сильним.

Якщо цього ланцюга не видно, навіть багато коду може виглядати як сирий набір фіч.
