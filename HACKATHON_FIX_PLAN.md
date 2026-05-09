# SignalCred Hackathon Fix Plan

This file is the implementation plan for fixes and upgrades needed before submitting SignalCred to:

- The Bags Hackathon on DoraHacks
- Colosseum Frontier Hackathon
- Tether Frontier Hackathon Track on Superteam Earn

It is not the public pitch. The public pitch belongs in `README.md`. This file is the working checklist for what needs to be fixed, added, or made more visible so judges can understand the product quickly.

---

## Goal

Make SignalCred judge-ready by proving one clear story:

> SignalCred is the social operating layer after a Bags launch. Other projects help users analyze, claim, automate, or campaign around tokens. SignalCred gives every launched token a place to live, trade, earn, and build community.

Primary Bags track:

- Social Finance

Secondary Bags tracks:

- Bags API
- Fee Sharing
- Claude Skills

Optional supporting angle:

- Payments through SOL tipping today and USDT support for Tether Frontier

Avoid primary positioning in:

- DeFi
- Privacy
- AI Agents

Those tracks have stronger direct competitors or require deeper proof than the current product should chase.

---

## Competitive Lessons To Use

### Tend / BagsFuel

What they do well:

- Fee automation
- Reward flywheels
- On-chain payout proof

What SignalCred should copy as a lesson:

- Make the economic loop visible.
- Show the fee path clearly.
- Use a simple diagram for how value flows.

What SignalCred should not copy:

- Do not compete as an auto-payout agent.

SignalCred angle:

- Fees become social reputation.
- Creator earnings are visible on token pages and leaderboards.
- Fee sharing is part of launch identity, not a separate admin tool.

### BagOS

What it does well:

- Claude/MCP-native workflow
- Clear tool count
- Strong "use inside Claude" story

What SignalCred should copy as a lesson:

- Claude Skills must look real and installable, not like generic AI buttons.

Required fix:

- Add `claude-skills/signalcred-creator/SKILL.md`.
- README should mention the skill file and the workflows it supports.

SignalCred angle:

- BagOS is an AI operating system for managing Bags.
- SignalCred uses Claude to help creators launch, explain, and grow token communities.

### TokenSight / CreatorRadar / Bags Trust Layer

What they do well:

- Token scoring
- Risk signals
- AI explanations

What SignalCred should copy as a lesson:

- Make AI output structured and easy to scan.

What SignalCred should not copy:

- Do not become another analytics dashboard.

SignalCred angle:

- Market data plus social context.
- Token analysis should include community posts, creator activity, and launch history, not just price/volume.

### Blackhole / CreatorLoop / Bags Boost

What they do well:

- Campaigns
- Quests
- Affiliate/reward mechanics

What SignalCred should copy as a lesson:

- Show creator growth mechanics clearly.

What SignalCred should not copy:

- Do not position as a campaign-only product.

SignalCred angle:

- Quests and affiliate campaigns are episodic.
- SignalCred is the permanent social surface for every token.

### TrustLink Pay

What it does well:

- Very clear payments narrative
- Human-readable identity
- Real-world payment framing

What SignalCred should copy as a lesson:

- Payments need a clear context and receipt.

SignalCred angle:

- TrustLink makes wallet payments safer through identity.
- SignalCred makes creator payments contextual through posts, token pages, and creator profiles.

---

## Fix Priority 1 - Social Finance Demo Must Be Obvious

Judges must see this in under 90 seconds.

Required fixes:

- Launch success flow must show the auto-generated launch post.
- Square feed must have a clear `Launches` tab.
- Auto launch post must link to the token page.
- Cashtags like `$TOKEN` should be visibly clickable.
- Token page should show token-specific posts.
- Creator profile should be reachable from token page and post author.
- Social score should be visible on token page or leaderboard.
- Tip button should be visible on posts.

Acceptance criteria:

- A judge can launch or inspect a token and immediately understand that SignalCred creates a community surface.
- The product does not look like a generic launchpad.

Demo proof:

```text
Launch Studio -> Launch Success -> Auto Post -> Square Feed -> Token Page -> Token Feed -> Tip
```

---

## Fix Priority 2 - Bags API Proof Must Be Visible

The project should not only say it uses Bags. It should show where Bags is used.

Required fixes:

- Add a small "Powered by Bags SDK" proof block in Launch Studio.
- Add SDK method labels or explanatory copy in README.
- Show fee config before launch.
- Show quote/swap on token page.
- Show fee claim or claimable positions in Fee Dashboard.

SDK proof checklist:

```text
sdk.tokenLaunch.createTokenInfoAndMetadata()
sdk.config.createBagsFeeShareConfig()
sdk.tokenLaunch.createLaunchTransaction()
sdk.trade.getQuote()
sdk.trade.createSwapTransaction()
sdk.fee.getAllClaimablePositions()
sdk.fee.getClaimTransactions()
sdk.partner.getPartnerConfigClaimStats()
```

Acceptance criteria:

- A judge can point to Launch, Trade, and Fees and see separate Bags integrations.
- README and demo agree with the product UI.

---

## Fix Priority 3 - Fee Sharing As Reputation

Do not fight Tend on automated payouts. Fight on visibility and creator reputation.

Required fixes:

- Fee split must be visible in Launch Studio.
- Token page should show fee split chart.
- Fee Dashboard should show creator/platform earnings.
- Leaderboard should rank tokens or creators by fee performance.
- README should use the phrase "fees become public reputation" or equivalent.

Acceptance criteria:

- A judge understands that SignalCred turns Bags fees into a public social signal.
- Fee sharing is connected to community discovery, not hidden in an admin page.

Demo proof:

```text
Launch fee split -> Token fee tab -> Creator fee dashboard -> Public leaderboard
```

---

## Fix Priority 4 - Claude Skills Must Be Real

Current AI features can be mistaken for normal API calls. For the Claude Skills track, package the workflow as a real skill.

Required files:

```text
claude-skills/
  signalcred-creator/
    SKILL.md
```

Required skill workflows:

- Token Draft Skill
- Token Analysis Skill
- Post Composer Skill
- Creator Profile Skill, if time allows

Required README update:

- Link to `claude-skills/signalcred-creator/SKILL.md`.
- Explain that Claude is used for creator workflows, not generic chat.

Acceptance criteria:

- A judge can open the skill file and understand how Claude should be used.
- SignalCred looks eligible for Claude Skills, not only "AI-powered".

---

## Fix Priority 5 - Tether Frontier Payment Lane

This is optional for Bags but important for the Tether Frontier submission.

Minimum useful scope:

- USDT support button on token page.
- USDT tip option on posts.
- Payment receipt attached to the post or token page.
- Creator dashboard separates:
  - Bags fee earnings
  - SOL tips
  - USDT support

If full USDT transfer support is too risky before submission:

- Add documented product flow and UI-ready placeholder.
- Do not claim completed transfers unless implemented.

Acceptance criteria:

- Tether judges understand how USDT fits naturally inside creator-token communities.
- The payment story is not generic wallet transfer. It is contextual creator support.

---

## Fix Priority 6 - Demo Video Script

Target length:

- 90 to 120 seconds

Script:

1. Open SignalCred and connect wallet.
2. Open Launch Studio.
3. Generate token copy with Claude.
4. Show fee split.
5. Launch or simulate launch through Bags.
6. Show auto launch post in Square.
7. Click cashtag or post link into token page.
8. Show chart and trade quote.
9. Tip the post author.
10. Run AI token analysis.
11. Open fee dashboard and leaderboard.
12. Close with: "Every Bags token gets a place to live."

Required visual beats:

- Auto launch post appears automatically.
- Fee split is visible.
- Bags SDK proof is visible.
- Social feed is active.
- Payment/tip is visible.

---

## Fix Priority 7 - Submission Copy

Create or update a submission text block for DoraHacks.

Required fields:

- App name: SignalCred
- One-liner: The launch-to-community platform for Bags creator tokens.
- Primary track: Social Finance
- Secondary tracks: Bags API, Fee Sharing, Claude Skills
- Problem: creator tokens die after launch because they have no social home.
- Solution: token page, auto launch post, Square feed, trade panel, fees, tips, creator profile.
- GitHub: repo URL
- Live demo: deployed URL
- Demo video: final video URL
- Token: SignalCred platform token mint

Core differentiation:

```text
Unlike campaign-only tools, launch generators, analytics dashboards, or fee bots,
SignalCred creates the permanent social surface for every Bags token.
```

---

## Fix Priority 8 - README Final Pass

README should be public and concise.

Keep:

- pitch
- problem
- solution
- hackathon strategy
- Bags track matrix
- SDK proof
- demo flow
- setup

Move internal planning to this file:

- implementation checklist
- competitor lessons
- detailed fix priorities

Acceptance criteria:

- README reads like a judge-facing submission.
- This file reads like an internal execution checklist.

---

## Recommended Execution Order

1. Add Claude Skill file.
2. Polish auto launch post and Square feed visibility.
3. Add Bags SDK proof UI/copy.
4. Strengthen fee split, fee dashboard, and leaderboard.
5. Add Tether/USDT payment lane or documented placeholder.
6. Record demo video.
7. Submit to DoraHacks.
8. Reframe the same product for Colosseum.
9. Reframe the same product for Tether Frontier.

---

## Final Submission Positioning

### DoraHacks Bags

Primary story:

```text
SignalCred is the Bags-native social finance layer after launch.
```

### Colosseum Frontier

Primary story:

```text
SignalCred is a Solana consumer startup that turns creator token launches into repeatable social commerce.
```

### Tether Frontier

Primary story:

```text
SignalCred embeds USDT creator payments inside token communities, posts, and launch pages.
```
