import { Prisma, PrismaClient } from '@prisma/client'

type CreateInvoiceParams = {
  prisma: PrismaClient
  merchantId: string
  amount: Prisma.Decimal
  currency: string
  network: string
  description?: string
  orderId?: string
  customData?: Record<string, any>
  notifyUrl?: string
  redirectUrl?: string
  returnUrl?: string
  expiresInSeconds?: number
}

type CreateInvoiceResult = {
  id: string
  amount: string
  currency: string
  network: string
  description?: string | null
  orderId?: string | null
  depositAddress: string
  qrCodeData: string | null
  status: string
  expiresAt: string
  notifyUrl?: string | null
  redirectUrl?: string | null
  returnUrl?: string | null
  paymentUrl: string
  message: string
}

const NETWORK_CODE_MAP: Record<string, string> = {
  binance_smart_chain: 'bsc',
  bnb_smart_chain: 'bsc',
  binance: 'bsc',
  ethereum_mainnet: 'ethereum',
  eth: 'ethereum',
  tron_mainnet: 'tron',
  trx: 'tron',
  matic: 'polygon',
  polygon_mainnet: 'polygon',
  bitcoin_mainnet: 'bitcoin',
  btc: 'bitcoin',
  litecoin_mainnet: 'litecoin',
  ltc: 'litecoin',
  dogecoin_mainnet: 'dogecoin',
  doge: 'dogecoin',
  bitcoin_cash: 'bitcoin-cash',
  bch: 'bitcoin-cash',
}

export async function createInvoiceForMerchant({
  prisma,
  merchantId,
  amount,
  currency,
  network,
  description,
  orderId,
  customData,
  notifyUrl,
  redirectUrl,
  returnUrl,
  expiresInSeconds = 3600,
}: CreateInvoiceParams): Promise<CreateInvoiceResult> {
  const normalizedNetwork =
    NETWORK_CODE_MAP[network.toLowerCase()] ?? network.toLowerCase()
  const upperCurrency = currency.toUpperCase()

  const assetNetwork = await prisma.assetNetwork.findFirst({
    where: {
      asset: { symbol: upperCurrency },
      network: { code: normalizedNetwork },
      isActive: true,
    },
    include: {
      asset: true,
      network: true,
    },
  })

  if (!assetNetwork) {
    throw new Error(
      `Unsupported currency/network combination: ${upperCurrency}/${network} (normalized: ${normalizedNetwork})`
    )
  }

  const kmsWallet = await prisma.kmsWallet.findFirst({
    where: {
      networkId: assetNetwork.networkId,
      status: 'ACTIVE',
      purpose: { in: ['DEPOSIT', 'BOTH'] },
    },
  })

  if (!kmsWallet) {
    throw new Error(
      `No active KMS wallet found for ${upperCurrency} on ${assetNetwork.network.code}`
    )
  }

  let merchantWallet = await prisma.merchantWallet.findFirst({
    where: {
      merchantId,
      assetNetworkId: assetNetwork.id,
    },
  })

  if (!merchantWallet) {
    merchantWallet = await prisma.merchantWallet.create({
      data: {
        merchantId,
        assetNetworkId: assetNetwork.id,
        availableBalance: 0,
        pendingBalance: 0,
        lockedBalance: 0,
      },
    })

    console.log(
      `✅ Auto-created merchant wallet for ${upperCurrency} on ${assetNetwork.network.code}`
    )
  }

  const { generateAddressFast } = await import('@/lib/kms/address-generator')

  const addressResult = await generateAddressFast(
    kmsWallet.id,
    assetNetwork.id,
    merchantId,
    upperCurrency
  )

  const paymentAddress = await prisma.paymentAddress.findUnique({
    where: { id: addressResult.addressId },
  })

  if (!paymentAddress) {
    throw new Error('Failed to create payment address for invoice')
  }

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
  const qrCodeData = `${upperCurrency.toLowerCase()}:${paymentAddress.address}?amount=${amount.toString()}`

  const invoice = await prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.invoice.create({
      data: {
        amount,
        currency: upperCurrency,
        network: normalizedNetwork,
        description,
        orderId,
        notifyUrl,
        redirectUrl,
        returnUrl,
        customData,
        depositAddress: paymentAddress.address,
        qrCodeData,
        expiresAt,
        merchantId,
        paymentAddressId: paymentAddress.id,
        status: 'PENDING',
      },
    })

    await tx.paymentAddress.update({
      where: { id: paymentAddress.id },
      data: { invoiceId: createdInvoice.id },
    })

    try {
      const { TatumNotificationService } = await import(
        '@/lib/tatum/notification-service'
      )
      const notificationService = new TatumNotificationService()

      const tatumChain = assetNetwork.network.tatumChainId
      const contractAddress = assetNetwork.contractAddress ?? undefined

      const subscriptionId = await notificationService.createSubscription({
        address: paymentAddress.address,
        chain: tatumChain,
        invoiceId: createdInvoice.id,
        currency: upperCurrency,
        contractAddress,
      })

      await tx.paymentAddress.update({
        where: { id: paymentAddress.id },
        data: {
          tatumSubscriptionId: subscriptionId,
          subscriptionActive: true,
        },
      })
    } catch (error) {
      console.error('❌ [INVOICE] Failed to create webhook subscription:', error)
      await tx.paymentAddress.update({
        where: { id: paymentAddress.id },
        data: {
          subscriptionActive: false,
          tatumSubscriptionId: null,
        },
      })
    }

    return createdInvoice
  })

  return {
    id: invoice.id,
    amount: invoice.amount.toString(),
    currency: invoice.currency,
    network: normalizedNetwork,
    description: invoice.description,
    orderId: invoice.orderId,
    depositAddress: paymentAddress.address,
    qrCodeData,
    status: invoice.status,
    expiresAt: invoice.expiresAt.toISOString(),
    notifyUrl: invoice.notifyUrl,
    redirectUrl: invoice.redirectUrl,
    returnUrl: invoice.returnUrl,
    paymentUrl: `https://pay.cryptic.com/${invoice.id}`,
    message: 'Invoice created successfully with payment monitoring enabled',
  }
}
