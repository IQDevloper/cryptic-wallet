# Unified Balance Architecture for Multi-Network Currencies

## 🎯 Problem Statement

Users expect unified balances for the same currency across networks:
- Deposit USDT on BSC → Balance shows as "USDT: 1000"
- Withdraw USDT to any network (ETH, BSC, TRON, Polygon)
- System handles network selection and fee differences automatically

## 🏗️ Architecture Solution

### 1. Unified Balance Display
```typescript
// Instead of separate network balances
interface UnifiedCurrencyBalance {
  currency: string        // "USDT", "BTC", "ETH"
  totalBalance: number    // Sum across all networks
  availableBalance: number // Total - locked amounts
  networkBreakdown: {
    [network: string]: {
      balance: number
      available: number
      locked: number
    }
  }
}

// Example result:
{
  currency: "USDT",
  totalBalance: 1800.00,
  availableBalance: 1750.00,
  networkBreakdown: {
    ethereum: { balance: 1000.00, available: 950.00, locked: 50.00 },
    bsc: { balance: 500.00, available: 500.00, locked: 0 },
    tron: { balance: 200.00, available: 200.00, locked: 0 },
    polygon: { balance: 100.00, available: 100.00, locked: 0 }
  }
}
```

### 2. Smart Withdrawal Algorithm
```typescript
interface WithdrawalRequest {
  merchantId: string
  currency: string        // "USDT"
  amount: number         // 300
  targetNetwork: string  // "bsc" - where user wants to receive
  targetAddress: string  // "0xABC123..." - user's BSC address
}

async function processUnifiedWithdrawal(request: WithdrawalRequest) {
  // 1. Get all network balances for this currency
  const networkBalances = await getMerchantNetworkBalances(
    request.merchantId, 
    request.currency
  )
  
  // 2. Check total available balance
  const totalAvailable = networkBalances.reduce((sum, nb) => 
    sum + (nb.balance - nb.lockedBalance), 0
  )
  
  if (totalAvailable < request.amount) {
    throw new Error('Insufficient balance')
  }
  
  // 3. Smart source selection
  const withdrawalPlan = selectOptimalSources(
    networkBalances, 
    request.amount, 
    request.targetNetwork
  )
  
  // 4. Execute multi-source withdrawal
  return executeWithdrawalPlan(withdrawalPlan, request)
}
```

### 3. Optimal Source Selection Strategy
```typescript
function selectOptimalSources(
  networkBalances: NetworkBalance[], 
  amount: number,
  targetNetwork: string
): WithdrawalPlan {
  
  // Strategy 1: Same Network First (no bridging needed)
  const sameNetworkBalance = networkBalances.find(nb => nb.network === targetNetwork)
  if (sameNetworkBalance && sameNetworkBalance.availableBalance >= amount) {
    return {
      sources: [{ network: targetNetwork, amount }],
      totalFees: calculateNetworkFee(targetNetwork, amount),
      needsBridging: false
    }
  }
  
  // Strategy 2: Lowest Fee Networks First
  const sortedByFee = networkBalances
    .filter(nb => nb.availableBalance > 0)
    .sort((a, b) => getWithdrawFee(a.network) - getWithdrawFee(b.network))
  
  // Strategy 3: Combine multiple networks if needed
  const sources = []
  let remaining = amount
  
  for (const balance of sortedByFee) {
    if (remaining <= 0) break
    
    const useAmount = Math.min(remaining, balance.availableBalance)
    sources.push({ 
      network: balance.network, 
      amount: useAmount 
    })
    remaining -= useAmount
  }
  
  return {
    sources,
    totalFees: calculateTotalFees(sources, targetNetwork),
    needsBridging: sources.length > 1 || sources[0].network !== targetNetwork
  }
}
```

## 🔄 Complete Withdrawal Flow

### Example: Withdraw 1500 USDT to BSC Address

**Current Balances:**
- USDT-ETH: 1000.00
- USDT-BSC: 500.00
- USDT-TRON: 200.00
- USDT-POLYGON: 100.00

**Withdrawal Plan:**
```typescript
{
  targetNetwork: "bsc",
  targetAddress: "0xUserBSCAddress...",
  withdrawalPlan: {
    sources: [
      { network: "bsc", amount: 500.00 },      // Use all BSC first
      { network: "polygon", amount: 100.00 },   // Then Polygon (lowest fees)
      { network: "tron", amount: 200.00 },      // Then TRON  
      { network: "ethereum", amount: 700.00 }   // Finally ETH (highest fees)
    ],
    totalFees: 25.50,
    needsBridging: true
  }
}
```

**Execution Steps:**
1. **Lock balances** across all source networks
2. **BSC Direct**: Send 500 USDT from BSC global wallet → User's BSC address
3. **Bridge Polygon**: Send 100 USDT from Polygon → BSC (via bridge/swap)
4. **Bridge TRON**: Send 200 USDT from TRON → BSC (via bridge/swap)  
5. **Bridge ETH**: Send 700 USDT from ETH → BSC (via bridge/swap)
6. **Update balances** in database

## 🎨 UI/UX Implementation

### Balance Display
```typescript
// Dashboard shows unified balance
<BalanceCard>
  <Currency>USDT</Currency>
  <TotalBalance>1,800.00</TotalBalance>
  <UsdValue>$1,800.00</UsdValue>
  
  {/* Expandable network breakdown */}
  <NetworkBreakdown>
    <NetworkBalance network="Ethereum" balance="1,000.00" />
    <NetworkBalance network="BSC" balance="500.00" />
    <NetworkBalance network="TRON" balance="200.00" />
    <NetworkBalance network="Polygon" balance="100.00" />
  </NetworkBreakdown>
</BalanceCard>
```

### Withdrawal UI
```typescript
<WithdrawForm>
  <CurrencySelect value="USDT" />
  <AmountInput max={1800.00} />
  <NetworkSelect 
    label="Withdraw to network"
    options={["Ethereum", "BSC", "TRON", "Polygon"]}
    onSelect={network => showFeeEstimate(network)}
  />
  <AddressInput placeholder="Enter destination address" />
  
  {/* Smart fee estimation */}
  <FeeBreakdown>
    <div>Network fees: $2.50</div>
    <div>Bridge fees: $5.00</div>
    <div>Total fees: $7.50</div>
    <div>You receive: 1,792.50 USDT</div>
  </FeeBreakdown>
</WithdrawForm>
```

## 🔧 Database Schema Updates

### Add Unified Balance View
```sql
-- Virtual table for unified balances
CREATE VIEW unified_merchant_balances AS
SELECT 
  mb.merchant_id,
  gw.currency,
  SUM(mb.balance) as total_balance,
  SUM(mb.balance - mb.locked_balance) as available_balance,
  SUM(mb.total_received) as total_received,
  SUM(mb.total_withdrawn) as total_withdrawn,
  JSON_OBJECT_AGG(
    gw.network, 
    JSON_BUILD_OBJECT(
      'balance', mb.balance,
      'available', mb.balance - mb.locked_balance,
      'locked', mb.locked_balance
    )
  ) as network_breakdown
FROM merchant_balances mb
JOIN global_hd_wallets gw ON mb.global_wallet_id = gw.id
GROUP BY mb.merchant_id, gw.currency;
```

### Add Withdrawal Tracking
```sql
CREATE TABLE unified_withdrawals (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  total_amount DECIMAL(36,18) NOT NULL,
  target_network TEXT NOT NULL,
  target_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  
  -- Multi-source tracking
  withdrawal_sources JSONB NOT NULL, -- [{"network": "bsc", "amount": 500}, ...]
  total_fees DECIMAL(36,18) NOT NULL,
  needs_bridging BOOLEAN DEFAULT false,
  
  -- Execution tracking
  transactions JSONB, -- Track all blockchain transactions
  completed_at TIMESTAMP,
  failed_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Implementation Plan

### Phase 1: Unified Balance Display
1. Create unified balance query
2. Update merchant balance API
3. Update dashboard UI to show unified balances

### Phase 2: Smart Withdrawal Logic  
1. Implement optimal source selection
2. Add withdrawal fee calculation
3. Build withdrawal execution engine

### Phase 3: Cross-Chain Bridging
1. Integrate with bridge/swap services (1inch, Thorchain, etc.)
2. Add bridge fee estimation
3. Handle bridge transaction monitoring

### Phase 4: Advanced Features
1. Auto-consolidation (move funds to lowest-fee networks)
2. Withdrawal optimization suggestions
3. Network status monitoring (congestion, fees)

## ⚠️ Important Considerations

### Liquidity Management
- Ensure each global wallet has sufficient funds for withdrawals
- Implement auto-rebalancing between networks
- Monitor network-specific liquidity needs

### Bridge/Swap Integration
- Partner with reliable bridge services
- Handle bridge failures gracefully
- Transparent fee disclosure

### User Education
- Clear explanation of network fees
- Bridge vs direct withdrawal differences
- Estimated completion times per network

## 🎯 End Result

Users see:
```
Balance: 1,800 USDT

Withdraw Options:
├── Ethereum (High fees, ~$15, 2-5 min)
├── BSC (Low fees, ~$1, 1-3 min) ✅ Recommended
├── TRON (Low fees, ~$1, 1-3 min)  
└── Polygon (Ultra low fees, ~$0.10, 30s)
```

**This creates the same experience as major exchanges while maintaining the security and efficiency of the Global HD Wallet architecture!**