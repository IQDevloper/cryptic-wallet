# Cryptic Gateway Database Architecture

This document outlines the comprehensive database schema designed for the Cryptic Gateway cryptocurrency payment system. The schema is optimized for financial data integrity, performance, and regulatory compliance.

## Overview

The database architecture follows these core principles:
- **Financial Precision**: Uses `Decimal` types for all monetary amounts to prevent floating-point errors
- **Audit Trails**: Comprehensive logging and version control for all critical operations
- **Data Integrity**: Proper constraints and foreign key relationships with CASCADE/RESTRICT policies
- **Performance Optimization**: Strategic indexes based on query patterns
- **Soft Deletes**: Implements soft delete patterns for audit compliance
- **Multi-Tenant Support**: Merchant isolation and row-level security

## Core Entity Relationships

```
User (1:1) ↔ Merchant (1:many) → Wallet (many:1) ← Currency
                ↓                    ↓
           MerchantSettings      BalanceHistory
                ↓
            Invoice (1:many) → Transaction
                ↓
          WebhookDelivery
```

## Primary Models

### Authentication & User Management

#### `User`
- **Purpose**: Core user authentication and authorization
- **Key Features**:
  - Role-based access control (ADMIN, MERCHANT, OPERATOR)
  - Email verification and password reset functionality
  - Soft delete support for audit trails
  - Session management integration

#### `UserSession`
- **Purpose**: Secure session management and tracking
- **Key Features**:
  - Session token management with expiration
  - IP address and user agent tracking
  - Active session monitoring

#### `AuditLog`
- **Purpose**: Comprehensive system event logging
- **Key Features**:
  - Action tracking (CREATE, UPDATE, DELETE, LOGIN)
  - Before/after value tracking for changes
  - IP address and endpoint logging
  - Regulatory compliance support

### Merchant Management

#### `Merchant`
- **Purpose**: Business account management and API configuration
- **Key Features**:
  - Business profile information (name, address, tax ID)
  - API key management with hashing and usage tracking
  - Webhook configuration and retry settings
  - Rate limiting and verification status
  - Soft delete support

#### `MerchantSettings`
- **Purpose**: Merchant-specific configuration and preferences
- **Key Features**:
  - Notification preferences (email, webhook, SMS)
  - Invoice and payment settings
  - Branding configuration (colors, logos)
  - Security settings (IP whitelist, signature requirements)
  - Business metadata and tax configuration

#### `ApiUsageStats`
- **Purpose**: API usage monitoring and rate limiting
- **Key Features**:
  - Endpoint-level usage tracking
  - Hourly and daily aggregation buckets
  - Response time and error rate monitoring
  - Rate limiting enforcement data

### Cryptocurrency Infrastructure

#### `Network`
- **Purpose**: Blockchain network configuration
- **Key Features**:
  - Network metadata (Bitcoin, Ethereum, BSC, etc.)
  - Block confirmation requirements
  - Network health monitoring
  - Testnet/mainnet support
  - RPC endpoint configuration

#### `Currency`
- **Purpose**: Cryptocurrency and token definitions
- **Key Features**:
  - Native coins and token support
  - Contract address management for tokens
  - Decimal precision configuration
  - Price integration metadata (CoinGecko, CoinMarketCap)
  - Display priorities and status management

#### `PriceHistory`
- **Purpose**: Historical price data for exchange rate calculations
- **Key Features**:
  - USD price tracking with high precision
  - Multiple data source support
  - Time-series data with unique constraints
  - 24-hour volume tracking

### Wallet & Balance Management

#### `Wallet`
- **Purpose**: Merchant cryptocurrency wallet management
- **Key Features**:
  - Tatum virtual account integration
  - Multi-balance tracking (confirmed, pending, locked)
  - Auto-withdrawal configuration
  - Balance thresholds and automation
  - Unique constraint per merchant-currency pair

#### `BalanceHistory`
- **Purpose**: Audit trail for all balance changes
- **Key Features**:
  - Before/after balance tracking
  - Change type classification (DEPOSIT, WITHDRAWAL, FEE, ADJUSTMENT)
  - Transaction reference linking
  - Immutable audit records

### Address Management

#### `AddressPool`
- **Purpose**: Pre-generated cryptocurrency address management
- **Key Features**:
  - HD wallet derivation path tracking
  - Address status lifecycle (AVAILABLE, ASSIGNED, USED, EXPIRED)
  - Balance monitoring and transaction counting
  - Private key encryption support
  - Memo field support for chains requiring it

### Payment Processing

#### `Invoice`
- **Purpose**: Payment request and invoice management
- **Key Features**:
  - Multi-currency amount tracking with exchange rates
  - Unique deposit address assignment
  - Payment status lifecycle management
  - QR code generation support
  - Webhook notification configuration
  - Merchant order ID integration

#### `Transaction`
- **Purpose**: Blockchain transaction tracking and processing
- **Key Features**:
  - Transaction hash and block information
  - Gas usage and fee tracking
  - Confirmation counting
  - Address verification (from/to)
  - Processing status and failure reason tracking
  - Tatum webhook integration

### Notification System

#### `WebhookDelivery`
- **Purpose**: Webhook event delivery and retry management
- **Key Features**:
  - Event type classification
  - Retry logic with exponential backoff
  - Payload and response logging
  - HTTP status code tracking
  - Timeout and error handling

## Indexes and Performance

### Strategic Index Design

The schema includes carefully designed indexes based on common query patterns:

#### High-Frequency Queries
- User authentication: `users(email)`, `user_sessions(sessionToken)`
- Invoice lookups: `invoices(depositAddress)`, `invoices(merchantId, status)`
- Transaction tracking: `transactions(txHash)`, `transactions(invoiceId)`
- Address management: `address_pools(address)`, `address_pools(merchantId, status)`

#### Time-Based Queries
- Audit trails: `audit_logs(createdAt)`, `balance_history(createdAt)`
- API monitoring: `api_usage_stats(hourlyBucket)`, `api_usage_stats(dailyBucket)`
- Invoice management: `invoices(expiresAt)`, `invoices(paidAt)`

#### Composite Indexes
- Merchant isolation: `wallets(merchantId, currencyId)`
- API aggregation: `api_usage_stats(merchantId, endpoint, method, hourlyBucket)`
- Price data: `price_history(currencyId, timestamp, source)`

## Data Types and Precision

### Financial Amounts
- **Invoice amounts**: `Decimal(36, 18)` - Supports large amounts with 18 decimal precision
- **Balance tracking**: `Decimal(36, 18)` - Consistent precision across all balance fields
- **Price data**: `Decimal(18, 8)` - Standard price precision for exchange rates
- **Tax rates**: `Decimal(5, 4)` - Supports tax rates up to 99.9999%

### Identifiers
- **Primary keys**: `cuid()` - Collision-resistant unique identifiers
- **Blockchain data**: `BigInt` for block numbers, `String` for hashes
- **Network gas**: `BigInt` for gas amounts and prices

## Security Considerations

### Data Protection
- **Soft deletes**: All critical models support soft deletion for audit compliance
- **Merchant isolation**: Foreign key constraints ensure data segregation
- **API key security**: SHA-256 hashing with secure random generation
- **Webhook signatures**: Secret key management for payload verification

### Audit Compliance
- **Immutable records**: Transaction and balance history are append-only
- **Complete audit trails**: All changes tracked with before/after values
- **User activity logging**: Session management and action tracking
- **Regulatory compliance**: Data retention and archival support

## Migration Strategy

### Development Environment
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Seed development data
npm run db:seed
```

### Production Deployment
```bash
# Create and apply migrations
npx prisma migrate deploy

# Verify schema integrity
npx prisma validate
```

## Monitoring and Maintenance

### Performance Monitoring
- Monitor query performance using database query logs
- Track index usage and optimize based on actual query patterns
- Monitor connection pool utilization
- Set up alerting for slow queries (>500ms)

### Data Archival
- Implement archival strategy for historical data (older than 2 years)
- Archive completed transactions and old audit logs
- Maintain price history for regulatory requirements
- Regular database maintenance and vacuum operations

### Backup Strategy
- Daily full database backups with point-in-time recovery
- Transaction log shipping for disaster recovery
- Regular restore testing on staging environment
- Encrypted backup storage with retention policies

## Test Data

The seed script creates comprehensive test data including:
- Admin user: `admin@crypticgateway.com` (password: `admin123`)
- Test merchant: `test@merchant.com` (password: `merchant123`)
- 8 blockchain networks (Bitcoin, Ethereum, BSC, TRON, Polygon, etc.)
- 13 cryptocurrencies including major tokens (USDT, USDC on multiple chains)
- Sample wallet configurations for major currencies
- Pre-generated address pools for Bitcoin and Ethereum
- Merchant settings with typical e-commerce configuration

This test data enables immediate development and testing of the payment gateway functionality.