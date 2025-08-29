import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class TransactionMonitor {
  private static instance: TransactionMonitor
  private isRunning = false
  private intervalId?: NodeJS.Timeout

  public static getInstance(): TransactionMonitor {
    if (!TransactionMonitor.instance) {
      TransactionMonitor.instance = new TransactionMonitor()
    }
    return TransactionMonitor.instance
  }

  public startMonitoring() {
    if (this.isRunning) return

    console.log('🔍 Starting transaction monitoring...')
    this.isRunning = true

    // Check for transactions every 30 seconds
    this.intervalId = setInterval(() => {
      this.checkPendingInvoices()
    }, 30000)

    // Initial check
    this.checkPendingInvoices()
  }

  public stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.isRunning = false
    console.log('⏹️ Transaction monitoring stopped')
  }

  private async checkPendingInvoices() {
    try {
      // Get all pending invoices that haven't expired
      const pendingInvoices = await prisma.invoice.findMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          merchant: true
        }
      })

      console.log(`🔍 Checking ${pendingInvoices.length} pending invoices...`)

      for (const invoice of pendingInvoices) {
        await this.checkInvoicePayment(invoice)
      }

      // Mark expired invoices
      await this.markExpiredInvoices()

    } catch (error) {
      console.error('❌ Error in transaction monitoring:', error)
    }
  }

  private async checkInvoicePayment(invoice: any) {
    try {
      // For MVP, we'll simulate finding transactions
      // In production, you would integrate with blockchain APIs or use Tatum webhooks
      
      // Check if this address has received any payments
      const mockTransaction = await this.simulateTransactionCheck(invoice)

      if (mockTransaction) {
        console.log(`💰 Payment detected for invoice ${invoice.id}`)
        
        // Create transaction record
        const transaction = await prisma.transaction.create({
          data: {
            txHash: mockTransaction.txHash,
            fromAddress: mockTransaction.from,
            toAddress: invoice.depositAddress,
            amount: mockTransaction.amount,
            currency: invoice.currency,
            network: mockTransaction.network,
            blockNumber: mockTransaction.blockNumber,
            confirmations: mockTransaction.confirmations,
            status: 'CONFIRMED',
            invoiceId: invoice.id
          }
        })

        // Update invoice status and amount
        const updatedInvoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: this.determineInvoiceStatus(invoice.amount, mockTransaction.amount),
            amountPaid: mockTransaction.amount,
            paidAt: new Date(),
            confirmedAt: new Date()
          }
        })

        // Update merchant balance
        await this.updateMerchantBalance(invoice.merchant.id, invoice.currency, mockTransaction.amount)

        // Send webhook notification
        if (invoice.merchant.webhookUrl) {
          await this.sendWebhookNotification(invoice.merchant.webhookUrl, updatedInvoice, transaction)
        }
      }
    } catch (error) {
      console.error(`❌ Error checking invoice ${invoice.id}:`, error)
    }
  }

  private async simulateTransactionCheck(invoice: any) {
    // This is a simulation for MVP testing
    // In production, replace with real blockchain API calls
    
    // 10% chance of finding a "payment" for testing
    if (Math.random() < 0.1) {
      return {
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from: `0x${Math.random().toString(16).substr(2, 40)}`,
        amount: Number(invoice.amount),
        network: 'ethereum', // or get from invoice
        blockNumber: Math.floor(Math.random() * 1000000),
        confirmations: 12
      }
    }
    return null
  }

  private determineInvoiceStatus(expectedAmount: number, paidAmount: number): string {
    const expected = Number(expectedAmount)
    const paid = Number(paidAmount)
    
    if (paid >= expected * 0.99) { // Allow 1% tolerance
      return 'PAID'
    } else if (paid > 0) {
      return 'UNDERPAID'
    }
    return 'PENDING'
  }

  private async updateMerchantBalance(merchantId: string, currency: string, amount: number) {
    try {
      // Find the merchant balance for this currency
      const merchantBalance = await prisma.merchantBalance.findFirst({
        where: {
          merchantId,
          globalWallet: {
            currency: currency.toUpperCase()
          }
        }
      })

      if (merchantBalance) {
        await prisma.merchantBalance.update({
          where: { id: merchantBalance.id },
          data: {
            balance: {
              increment: amount
            },
            totalReceived: {
              increment: amount
            },
            lastUpdated: new Date()
          }
        })
        console.log(`💰 Updated merchant balance: +${amount} ${currency}`)
      }
    } catch (error) {
      console.error('❌ Error updating merchant balance:', error)
    }
  }

  private async markExpiredInvoices() {
    try {
      const expiredCount = await prisma.invoice.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            lte: new Date()
          }
        },
        data: {
          status: 'EXPIRED'
        }
      })

      if (expiredCount.count > 0) {
        console.log(`⏰ Marked ${expiredCount.count} invoices as expired`)
      }
    } catch (error) {
      console.error('❌ Error marking expired invoices:', error)
    }
  }

  private async sendWebhookNotification(webhookUrl: string, invoice: any, transaction: any) {
    try {
      const payload = {
        event: 'invoice.paid',
        invoice: {
          id: invoice.id,
          amount: invoice.amount.toString(),
          amountPaid: invoice.amountPaid.toString(),
          currency: invoice.currency,
          status: invoice.status,
          orderId: invoice.orderId,
          paidAt: invoice.paidAt?.toISOString(),
          createdAt: invoice.createdAt.toISOString()
        },
        transaction: {
          id: transaction.id,
          txHash: transaction.txHash,
          amount: transaction.amount.toString(),
          confirmations: transaction.confirmations,
          status: transaction.status
        }
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cryptic-Gateway-Webhook'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        console.log(`✅ Webhook sent successfully to ${webhookUrl}`)
      } else {
        console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error(`❌ Error sending webhook to ${webhookUrl}:`, error)
    }
  }
}

// Start monitoring when the module is imported (for development)
if (process.env.NODE_ENV === 'development') {
  TransactionMonitor.getInstance().startMonitoring()
}