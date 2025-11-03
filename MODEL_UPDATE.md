# 🔄 Model Update - Claude Sonnet 4.5

## What Changed

Updated the AI coin addition tool to use the latest **Claude Sonnet 4.5** model.

---

## ✅ Updated Model

**Previous**: `claude-3-5-sonnet-20241022` ❌ (Not found error)

**Current**: `claude-sonnet-4-5-20250929` ✅ (Latest model, January 2025)

---

## 📊 Model Information

### Claude Sonnet 4.5
- **API ID**: `claude-sonnet-4-5-20250929`
- **Released**: September 29, 2025
- **Best for**: General use, most capable model
- **Pricing**: $3 input / $15 output per million tokens
- **Speed**: Fast
- **Context**: 200K tokens

### Alternative Models Available:

If you want faster/cheaper responses, you can change the model:

#### Claude Haiku 4.5 (Fastest & Cheapest)
```typescript
// In scripts/ai-add-coin.ts line 223:
model: 'claude-haiku-4-5-20251001',
```
- **Cost**: $1 input / $5 output per million tokens
- **Speed**: Very fast
- **Best for**: Simple coin lookups

#### Claude Opus 4.1 (Best Reasoning)
```typescript
// In scripts/ai-add-coin.ts line 223:
model: 'claude-opus-4-1-20250805',
```
- **Cost**: $15 input / $75 output per million tokens
- **Speed**: Slower
- **Best for**: Complex/obscure coins

---

## 💰 Cost Comparison

### Sonnet 4.5 (Recommended)
- Per coin: ~$0.01
- 100 coins: ~$1.00

### Haiku 4.5 (Budget)
- Per coin: ~$0.003
- 100 coins: ~$0.30

### Opus 4.1 (Premium)
- Per coin: ~$0.05
- 100 coins: ~$5.00

---

## 🧪 Testing

```bash
npm run ai:add-coin

# Test with a known coin
Symbol: BTC

# Should work now with Claude Sonnet 4.5!
```

---

## 📚 Model Documentation

Full model details: https://docs.claude.com/en/docs/about-claude/models

---

## 🔄 Migration Notes

If you were using the old model name and getting errors, the tool will now:
1. ✅ Use Claude Sonnet 4.5 by default
2. ✅ Provide better research quality
3. ✅ Cost the same (~$0.01 per coin)
4. ✅ Work without any code changes needed

---

**Updated**: January 2025
**Model**: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
