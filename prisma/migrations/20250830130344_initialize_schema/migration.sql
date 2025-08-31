-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'UNDERPAID', 'OVERPAID', 'PROCESSING');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REJECTED', 'REPLACED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('INVOICE_CREATED', 'INVOICE_PAID', 'INVOICE_EXPIRED', 'INVOICE_CANCELLED', 'TRANSACTION_CONFIRMED', 'TRANSACTION_FAILED');

-- CreateEnum
CREATE TYPE "AddressStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'WEBHOOK', 'SMS');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MERCHANT', 'OPERATOR');

-- CreateEnum
CREATE TYPE "GlobalWalletStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "passwordResetExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MERCHANT',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "apiKeyCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiKeyLastUsed" TIMESTAMP(3),
    "businessAddress" TEXT,
    "businessName" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "deletedAt" TIMESTAMP(3),
    "invoiceExpiry" INTEGER NOT NULL DEFAULT 3600,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "rateLimitWindow" INTEGER NOT NULL DEFAULT 3600,
    "taxId" TEXT,
    "webhookRetryCount" INTEGER NOT NULL DEFAULT 3,
    "webhookSecret" TEXT,
    "webhookTimeout" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "networks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tatumChainId" TEXT NOT NULL,
    "blockConfirmations" INTEGER NOT NULL DEFAULT 6,
    "isTestnet" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "averageBlockTime" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "explorerUrl" TEXT,
    "lastBlockChecked" BIGINT,
    "lastStatusCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxWithdrawAmount" DECIMAL(36,18),
    "minWithdrawAmount" DECIMAL(36,18),
    "networkStatus" TEXT NOT NULL DEFAULT 'healthy',
    "rpcUrl" TEXT,
    "withdrawFee" DECIMAL(36,18) NOT NULL DEFAULT 0,

    CONSTRAINT "networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "base_currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "imageUrl" TEXT,
    "coinGeckoId" TEXT,
    "coinMarketCapId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "base_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "baseCurrencyId" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "contractAddress" TEXT,
    "decimals" INTEGER NOT NULL,
    "isToken" BOOLEAN NOT NULL DEFAULT false,
    "tokenStandard" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "maxAmount" DECIMAL(36,18),
    "minAmount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "withdrawFee" DECIMAL(36,18) NOT NULL DEFAULT 0,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "currency" TEXT NOT NULL,
    "depositAddress" TEXT NOT NULL,
    "description" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "merchantId" TEXT NOT NULL,
    "derivedAddressId" TEXT NOT NULL,
    "amountPaid" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "customData" JSONB,
    "deletedAt" TIMESTAMP(3),
    "exchangeRate" DECIMAL(18,8),
    "fiatAmount" DECIMAL(10,2),
    "fiatCurrency" TEXT,
    "memo" TEXT,
    "notifyUrl" TEXT,
    "orderId" TEXT,
    "qrCodeData" TEXT,
    "redirectUrl" TEXT,
    "returnUrl" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "blockNumber" BIGINT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "tatumWebhookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "blockHash" TEXT,
    "deletedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "fromAddress" TEXT,
    "gasPrice" BIGINT,
    "gasUsed" BIGINT,
    "processedAt" TIMESTAMP(3),
    "toAddress" TEXT,
    "transactionFee" DECIMAL(36,18),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_pools" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "privateKey" TEXT,
    "derivationPath" TEXT,
    "addressIndex" INTEGER,
    "memo" TEXT,
    "status" "AddressStatus" NOT NULL DEFAULT 'AVAILABLE',
    "assignedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "currentBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "totalReceived" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "merchantId" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,

    CONSTRAINT "address_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventType" "WebhookEventType" NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "response" JSONB,
    "httpStatus" INTEGER,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "merchantId" TEXT NOT NULL,
    "invoiceId" TEXT,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_settings" (
    "id" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "webhookNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "defaultInvoiceExpiry" INTEGER NOT NULL DEFAULT 3600,
    "allowPartialPayments" BOOLEAN NOT NULL DEFAULT false,
    "autoConfirmPayments" BOOLEAN NOT NULL DEFAULT true,
    "minimumConfirmations" INTEGER NOT NULL DEFAULT 6,
    "brandColor" TEXT,
    "logoUrl" TEXT,
    "companyName" TEXT,
    "supportEmail" TEXT,
    "ipWhitelist" TEXT[],
    "requireSignature" BOOLEAN NOT NULL DEFAULT true,
    "allowTestMode" BOOLEAN NOT NULL DEFAULT false,
    "businessType" TEXT,
    "businessCountry" TEXT,
    "taxRate" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "merchantId" TEXT NOT NULL,

    CONSTRAINT "merchant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage_stats" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "responseTime" INTEGER,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "hourlyBucket" TIMESTAMP(3) NOT NULL,
    "dailyBucket" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "merchantId" TEXT NOT NULL,

    CONSTRAINT "api_usage_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsed" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT,
    "recordId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "volume24h" DECIMAL(18,8),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'coingecko',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseCurrencyId" TEXT NOT NULL,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_hd_wallets" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "contractAddress" TEXT,
    "mnemonicEncrypted" TEXT NOT NULL,
    "xpub" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "derivationPath" TEXT NOT NULL,
    "nextAddressIndex" BIGINT NOT NULL DEFAULT 0,
    "totalPoolBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "status" "GlobalWalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_hd_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_balances" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "globalWalletId" TEXT NOT NULL,
    "balance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "lockedBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "totalReceived" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "derived_addresses" (
    "id" TEXT NOT NULL,
    "globalWalletId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "derivationIndex" BIGINT NOT NULL,
    "currentBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "assignedToInvoice" TEXT,
    "firstUsedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tatumSubscriptionId" TEXT,
    "subscriptionActive" BOOLEAN NOT NULL DEFAULT false,
    "lastNotificationAt" TIMESTAMP(3),

    CONSTRAINT "derived_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_notifications" (
    "id" TEXT NOT NULL,
    "derivedAddressId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "txHash" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "blockNumber" BIGINT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "chain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "webhookPayload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "totalAmount" DECIMAL(36,18) NOT NULL,
    "targetNetwork" TEXT NOT NULL,
    "targetAddress" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "withdrawalSources" JSONB NOT NULL,
    "totalFees" DECIMAL(36,18) NOT NULL,
    "needsBridging" BOOLEAN NOT NULL DEFAULT false,
    "transactions" JSONB,
    "completedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_apiKey_key" ON "merchants"("apiKey");

-- CreateIndex
CREATE INDEX "merchants_isActive_idx" ON "merchants"("isActive");

-- CreateIndex
CREATE INDEX "merchants_isVerified_idx" ON "merchants"("isVerified");

-- CreateIndex
CREATE INDEX "merchants_createdAt_idx" ON "merchants"("createdAt");

-- CreateIndex
CREATE INDEX "merchants_deletedAt_idx" ON "merchants"("deletedAt");

-- CreateIndex
CREATE INDEX "merchants_apiKeyLastUsed_idx" ON "merchants"("apiKeyLastUsed");

-- CreateIndex
CREATE UNIQUE INDEX "networks_code_key" ON "networks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "networks_tatumChainId_key" ON "networks"("tatumChainId");

-- CreateIndex
CREATE INDEX "networks_code_idx" ON "networks"("code");

-- CreateIndex
CREATE INDEX "networks_isActive_idx" ON "networks"("isActive");

-- CreateIndex
CREATE INDEX "networks_isTestnet_idx" ON "networks"("isTestnet");

-- CreateIndex
CREATE INDEX "networks_networkStatus_idx" ON "networks"("networkStatus");

-- CreateIndex
CREATE INDEX "networks_deletedAt_idx" ON "networks"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "base_currencies_code_key" ON "base_currencies"("code");

-- CreateIndex
CREATE INDEX "base_currencies_code_idx" ON "base_currencies"("code");

-- CreateIndex
CREATE INDEX "base_currencies_symbol_idx" ON "base_currencies"("symbol");

-- CreateIndex
CREATE INDEX "base_currencies_isActive_idx" ON "base_currencies"("isActive");

-- CreateIndex
CREATE INDEX "base_currencies_priority_idx" ON "base_currencies"("priority");

-- CreateIndex
CREATE INDEX "base_currencies_deletedAt_idx" ON "base_currencies"("deletedAt");

-- CreateIndex
CREATE INDEX "currencies_baseCurrencyId_idx" ON "currencies"("baseCurrencyId");

-- CreateIndex
CREATE INDEX "currencies_networkId_idx" ON "currencies"("networkId");

-- CreateIndex
CREATE INDEX "currencies_contractAddress_idx" ON "currencies"("contractAddress");

-- CreateIndex
CREATE INDEX "currencies_isActive_idx" ON "currencies"("isActive");

-- CreateIndex
CREATE INDEX "currencies_deletedAt_idx" ON "currencies"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_baseCurrencyId_networkId_key" ON "currencies"("baseCurrencyId", "networkId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_depositAddress_key" ON "invoices"("depositAddress");

-- CreateIndex
CREATE INDEX "invoices_merchantId_idx" ON "invoices"("merchantId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_depositAddress_idx" ON "invoices"("depositAddress");

-- CreateIndex
CREATE INDEX "invoices_expiresAt_idx" ON "invoices"("expiresAt");

-- CreateIndex
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");

-- CreateIndex
CREATE INDEX "invoices_paidAt_idx" ON "invoices"("paidAt");

-- CreateIndex
CREATE INDEX "invoices_orderId_idx" ON "invoices"("orderId");

-- CreateIndex
CREATE INDEX "invoices_deletedAt_idx" ON "invoices"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_txHash_key" ON "transactions"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tatumWebhookId_key" ON "transactions"("tatumWebhookId");

-- CreateIndex
CREATE INDEX "transactions_txHash_idx" ON "transactions"("txHash");

-- CreateIndex
CREATE INDEX "transactions_invoiceId_idx" ON "transactions"("invoiceId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_blockNumber_idx" ON "transactions"("blockNumber");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_processedAt_idx" ON "transactions"("processedAt");

-- CreateIndex
CREATE INDEX "transactions_deletedAt_idx" ON "transactions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "address_pools_address_key" ON "address_pools"("address");

-- CreateIndex
CREATE INDEX "address_pools_address_idx" ON "address_pools"("address");

-- CreateIndex
CREATE INDEX "address_pools_merchantId_idx" ON "address_pools"("merchantId");

-- CreateIndex
CREATE INDEX "address_pools_networkId_idx" ON "address_pools"("networkId");

-- CreateIndex
CREATE INDEX "address_pools_status_idx" ON "address_pools"("status");

-- CreateIndex
CREATE INDEX "address_pools_assignedAt_idx" ON "address_pools"("assignedAt");

-- CreateIndex
CREATE INDEX "address_pools_deletedAt_idx" ON "address_pools"("deletedAt");

-- CreateIndex
CREATE INDEX "webhook_deliveries_merchantId_idx" ON "webhook_deliveries"("merchantId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_invoiceId_idx" ON "webhook_deliveries"("invoiceId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_eventType_idx" ON "webhook_deliveries"("eventType");

-- CreateIndex
CREATE INDEX "webhook_deliveries_nextRetryAt_idx" ON "webhook_deliveries"("nextRetryAt");

-- CreateIndex
CREATE INDEX "webhook_deliveries_createdAt_idx" ON "webhook_deliveries"("createdAt");

-- CreateIndex
CREATE INDEX "webhook_deliveries_deletedAt_idx" ON "webhook_deliveries"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_settings_merchantId_key" ON "merchant_settings"("merchantId");

-- CreateIndex
CREATE INDEX "api_usage_stats_merchantId_idx" ON "api_usage_stats"("merchantId");

-- CreateIndex
CREATE INDEX "api_usage_stats_hourlyBucket_idx" ON "api_usage_stats"("hourlyBucket");

-- CreateIndex
CREATE INDEX "api_usage_stats_dailyBucket_idx" ON "api_usage_stats"("dailyBucket");

-- CreateIndex
CREATE INDEX "api_usage_stats_endpoint_idx" ON "api_usage_stats"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_stats_merchantId_endpoint_method_hourlyBucket_key" ON "api_usage_stats"("merchantId", "endpoint", "method", "hourlyBucket");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_sessionToken_idx" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_expires_idx" ON "user_sessions"("expires");

-- CreateIndex
CREATE INDEX "user_sessions_isActive_idx" ON "user_sessions"("isActive");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_tableName_idx" ON "audit_logs"("tableName");

-- CreateIndex
CREATE INDEX "audit_logs_recordId_idx" ON "audit_logs"("recordId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "price_history_baseCurrencyId_idx" ON "price_history"("baseCurrencyId");

-- CreateIndex
CREATE INDEX "price_history_timestamp_idx" ON "price_history"("timestamp");

-- CreateIndex
CREATE INDEX "price_history_source_idx" ON "price_history"("source");

-- CreateIndex
CREATE UNIQUE INDEX "price_history_baseCurrencyId_timestamp_source_key" ON "price_history"("baseCurrencyId", "timestamp", "source");

-- CreateIndex
CREATE INDEX "global_hd_wallets_status_idx" ON "global_hd_wallets"("status");

-- CreateIndex
CREATE INDEX "global_hd_wallets_currency_idx" ON "global_hd_wallets"("currency");

-- CreateIndex
CREATE INDEX "global_hd_wallets_network_idx" ON "global_hd_wallets"("network");

-- CreateIndex
CREATE UNIQUE INDEX "global_hd_wallets_currency_network_contractAddress_key" ON "global_hd_wallets"("currency", "network", "contractAddress");

-- CreateIndex
CREATE INDEX "merchant_balances_merchantId_idx" ON "merchant_balances"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_balances_globalWalletId_idx" ON "merchant_balances"("globalWalletId");

-- CreateIndex
CREATE INDEX "merchant_balances_balance_idx" ON "merchant_balances"("balance");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_balances_merchantId_globalWalletId_key" ON "merchant_balances"("merchantId", "globalWalletId");

-- CreateIndex
CREATE UNIQUE INDEX "derived_addresses_address_key" ON "derived_addresses"("address");

-- CreateIndex
CREATE INDEX "derived_addresses_globalWalletId_idx" ON "derived_addresses"("globalWalletId");

-- CreateIndex
CREATE INDEX "derived_addresses_merchantId_idx" ON "derived_addresses"("merchantId");

-- CreateIndex
CREATE INDEX "derived_addresses_derivationIndex_idx" ON "derived_addresses"("derivationIndex");

-- CreateIndex
CREATE INDEX "derived_addresses_assignedToInvoice_idx" ON "derived_addresses"("assignedToInvoice");

-- CreateIndex
CREATE INDEX "derived_addresses_tatumSubscriptionId_idx" ON "derived_addresses"("tatumSubscriptionId");

-- CreateIndex
CREATE INDEX "derived_addresses_subscriptionActive_idx" ON "derived_addresses"("subscriptionActive");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_notifications_txHash_key" ON "webhook_notifications"("txHash");

-- CreateIndex
CREATE INDEX "webhook_notifications_derivedAddressId_idx" ON "webhook_notifications"("derivedAddressId");

-- CreateIndex
CREATE INDEX "webhook_notifications_invoiceId_idx" ON "webhook_notifications"("invoiceId");

-- CreateIndex
CREATE INDEX "webhook_notifications_txHash_idx" ON "webhook_notifications"("txHash");

-- CreateIndex
CREATE INDEX "webhook_notifications_status_idx" ON "webhook_notifications"("status");

-- CreateIndex
CREATE INDEX "webhook_notifications_createdAt_idx" ON "webhook_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "withdrawals_merchantId_idx" ON "withdrawals"("merchantId");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "withdrawals_createdAt_idx" ON "withdrawals"("createdAt");

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_baseCurrencyId_fkey" FOREIGN KEY ("baseCurrencyId") REFERENCES "base_currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_derivedAddressId_fkey" FOREIGN KEY ("derivedAddressId") REFERENCES "derived_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address_pools" ADD CONSTRAINT "address_pools_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address_pools" ADD CONSTRAINT "address_pools_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_settings" ADD CONSTRAINT "merchant_settings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage_stats" ADD CONSTRAINT "api_usage_stats_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_baseCurrencyId_fkey" FOREIGN KEY ("baseCurrencyId") REFERENCES "base_currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_balances" ADD CONSTRAINT "merchant_balances_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_balances" ADD CONSTRAINT "merchant_balances_globalWalletId_fkey" FOREIGN KEY ("globalWalletId") REFERENCES "global_hd_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derived_addresses" ADD CONSTRAINT "derived_addresses_globalWalletId_fkey" FOREIGN KEY ("globalWalletId") REFERENCES "global_hd_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derived_addresses" ADD CONSTRAINT "derived_addresses_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_notifications" ADD CONSTRAINT "webhook_notifications_derivedAddressId_fkey" FOREIGN KEY ("derivedAddressId") REFERENCES "derived_addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_notifications" ADD CONSTRAINT "webhook_notifications_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
