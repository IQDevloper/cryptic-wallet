# Cryptic Gateway Documentation

This directory contains comprehensive documentation for the Cryptic Gateway project.

## 📁 Structure

### `/architecture`
Core system architecture and design documents:
- **HD_WALLET_ARCHITECTURE.md** - HD wallet system design and implementation details
- **UNIFIED_BALANCE_ARCHITECTURE.md** - Balance management and currency handling architecture  
- **MULTI_NETWORK_ARCHITECTURE.md** - Multi-blockchain network support design
- **SCHEMA_MIGRATION_PLAN.md** - Database schema evolution and migration strategy
- **HD_WALLET_MIGRATION_TRACKER.md** - Progress tracking for wallet system migration

### `/implementation`  
Implementation guides and technical documentation:
- **TATUM_WEBHOOK_IMPLEMENTATION.md** - Tatum webhook integration guide
- **WEBHOOK_TESTING_GUIDE.md** - Testing procedures for webhook functionality
- **CRYPTO_MANAGEMENT.md** - Cryptocurrency asset management documentation
- **UNIFIED_BALANCE_IMPLEMENTATION_LOG.md** - Development log for balance system implementation
- **cryptic-gateway-build-prompt.md** - Build and deployment instructions

### Root Level Files
- **FIRST.md** - Getting started guide
- **archon_claude_code_rules.md** - Development guidelines and coding standards
- **database-architecture.md** - Database design overview

## 🚀 Quick Start

1. Start with `/FIRST.md` for initial setup
2. Review `/architecture` documents for system understanding  
3. Follow `/implementation` guides for specific features
4. Reference coding standards in `archon_claude_code_rules.md`

## 📋 Migration Status

The project is currently undergoing a database schema simplification:
- **Current**: 22 complex models with multiple joins
- **Target**: 10 clean models with unified CryptoAsset approach
- **Progress**: See `architecture/SCHEMA_MIGRATION_PLAN.md` for details

## 🔗 Related Files

- Main project configuration: `/CLAUDE.md`
- Database schema: `/prisma/schema.prisma` 
- Migration scripts: `/scripts/migrate-to-crypto-assets.js`