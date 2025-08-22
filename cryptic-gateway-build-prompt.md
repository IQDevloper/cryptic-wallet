>
# Cryptic Gateway — Archon Project ID (c028af0a-9c65-4083-a2fb-fa3ba3c85c12)

Create a new **Cryptic Gateway** project (similar to **Cryptomus**) powered by the **Tatum API**.

## Table of Contents
- [Sources & Context](#sources--context)
- [Backend](#backend)
  - [Schema](#schema)
  - [Flows (guided by Tatum docs)](#flows-guided-by-tatum-docs)
- [Frontend](#frontend)
  - [Setup](#setup)
  - [Design Guidelines (Stage 2)](#design-guidelines-stage-2)
- [Deliverables](#deliverables)

---

## Sources & Context
- **Before implementing anything**, read the **Tatum API knowledge base** via **Archon MCP** (and **Context 7 MCP** if available). Use it to decide:
  - Prisma schema shape
  - Currency/Network model
  - Wallet & virtual account management
  - Merchant & invoice flow
  - Webhook semantics and confirmation rules

## Backend
- Start from `@prisma/schema.prisma`; only change it when required by Tatum docs.  
- Internal API: **tRPC**. Public merchant API: **REST**.  
- Reuse PostgreSQL + Redis from `@docker-compose.yml`.

### Schema
- Keep schema aligned with Tatum wallet/virtual account models.  
- Support multi-chain tokens and networks.  
- Map codes to Tatum chain identifiers.

### Flows (guided by Tatum docs)
1) **Merchant Creation**
- On signup, create **Virtual Accounts** for each supported currency and store them in `Wallet`, linked to the merchant.  
- This enables multi-currency management.

2) **Virtual Accounts**
- Each corresponds to a specific currency/network and abstracts blockchain complexity for accounting, security, and scalability.

3) **Invoice Creation**
- Creating an invoice generates a **deposit address** from the relevant virtual account.  
- Address is unique per invoice; customer pays to this address.

4) **Payment Monitoring & Processing**
- Receive **Tatum webhooks** on transaction events.  
- Process idempotently: update `Transaction` + transition `Invoice` (`PENDING`→`COMPLETED`) and update virtual account balances.

## Frontend

### Setup
- **Next.js (latest, App Router) + TypeScript**.  
- Dependencies: `shadcn/ui`, `react-icons`.  
- Use **Context 7 MCP** to pull the latest design notes before implementation.

### Design Guidelines (Stage 2)
- Professional, modern, **responsive** UI (mobile/tablet/desktop).  
- Consistent theming; clean, reusable components.  
- Accessible (ARIA, keyboard navigation).  
- Intuitive navigation (Dashboard → Invoices → Payments).  
- **Currency → Network** selection UX like the screenshot.

## Deliverables
- Monorepo with:
  - Prisma migrations **seeded** with currencies & networks below.  
  - Public REST (merchant APIs) + internal tRPC (console).  
  - E2E demo: merchant → auto virtual accounts → enable currencies → create invoice → customer selects currency→network → pays → webhook confirms → invoice **PAID**.

- **Seeded Currencies & Networks**
```ts
const currencies: ICurrencySeed[] = [
  // Native Coins
  { code: 'BTC',  name: 'Bitcoin',      decimals: 8,  imageUrl: 'https://storage.cryptomus.com/currencies/BTC.svg',  network: 'BTC' },
  { code: 'ETH',  name: 'Ethereum',     decimals: 18, imageUrl: 'https://storage.cryptomus.com/currencies/ETH.svg',  network: 'ETH' },
  { code: 'BNB',  name: 'Binance Coin', decimals: 18, imageUrl: 'https://storage.cryptomus.com/currencies/BNB.svg',  network: 'BNB' },
  { code: 'TRX',  name: 'TRON',         decimals: 6,  imageUrl: 'https://storage.cryptomus.com/currencies/TRX.svg',  network: 'TRX' },
  { code: 'MATIC',name: 'Polygon',      decimals: 18, imageUrl: 'https://storage.cryptomus.com/currencies/MATIC.svg',network: 'MATIC' },
  { code: 'DOGE', name: 'Dogecoin',     decimals: 8,  imageUrl: 'https://storage.cryptomus.com/currencies/DOGE.svg', network: 'DOGE' },
  { code: 'LTC',  name: 'Litecoin',     decimals: 8,  imageUrl: 'https://storage.cryptomus.com/currencies/LTC.svg',  network: 'LTC' },
  { code: 'BCH',  name: 'Bitcoin Cash', decimals: 8,  imageUrl: 'https://storage.cryptomus.com/currencies/BCH.svg',  network: 'BCH' },

  // Tokens
  { code: 'USDT_ERC20', name: 'USDT (ERC20)', decimals: 6, contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', imageUrl: 'https://storage.cryptomus.com/currencies/USDT.svg', isToken: true, network: 'ETH' },
  { code: 'USDC_ERC20', name: 'USDC (ERC20)', decimals: 6, contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', imageUrl: 'https://storage.cryptomus.com/currencies/USDC.svg', isToken: true, network: 'ETH' },
  { code: 'USDT_TRC20', name: 'USDT (TRC20)', decimals: 6, contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',          imageUrl: 'https://storage.cryptomus.com/currencies/USDT.svg', isToken: true, network: 'TRX' },
  { code: 'USDC_TRC20', name: 'USDC (TRC20)', decimals: 6, contractAddress: 'TLBaRhANQoJFTqre9Nf1mjuwNWjCJeYqUL',         imageUrl: 'https://storage.cryptomus.com/currencies/USDC.svg', isToken: true, network: 'TRX' },
  { code: 'USDT_BEP20', name: 'USDT (BEP20)', decimals: 6, contractAddress: '0x55d398326f99059fF775485246999027B3197955', imageUrl: 'https://storage.cryptomus.com/currencies/USDT.svg', isToken: true, network: 'BNB' },
];
```

- **Mapping Requirement (align seeding with Tatum)**
  - After reading Tatum docs via **Archon MCP**, map our codes to Tatum chain identifiers and store them with each currency/network:
    - `BTC`  → Tatum chain: `BTC`
    - `ETH`  → `ETH` (a.k.a. `ethereum`)
    - `BNB`  → `BSC` (Binance Smart Chain)
    - `TRX`  → `TRON`
    - `MATIC`→ `POLYGON`
    - `DOGE` → `DOGE`
    - `LTC`  → `LTC`
    - `BCH`  → `BCH`
    - Token variants:
      - `USDT_ERC20`, `USDC_ERC20` → chain `ETH`, standard `ERC20`
      - `USDT_TRC20`, `USDC_TRC20` → chain `TRON`, standard `TRC20`
      - `USDT_BEP20`               → chain `BSC`, standard `BEP20`
  - Normalize to Tatum’s official identifiers (`ethereum`, `bsc`, `tron`, `polygon`) and persist both our display code and Tatum chain key.  
  - Validate decimals and contract addresses against Tatum’s references.

- **Schema Review Output**
  1. Summary of Tatum features used (wallets/virtual accounts, addresses, webhooks, confirmation rules).  
  2. Prisma schema diffs required by Tatum (with justifications).  
  3. Ops notes: chain confirmations, fees/dust handling, partial payments, invoice expiry, idempotency keys.

## Rules
- Retrieve the latest documentation for Next.js via the Context 7 MCP or tailwind 4.
- Fetch the latest Tatum knowledge base documentation via the Archon MCP or tailwind 4.
- Obtain the most up-to-date guidelines for Shadcn UI via the Shadcn-UI MCP.
