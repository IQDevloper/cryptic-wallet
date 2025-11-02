/* prisma/seed.assets.ts */
import {
  PrismaClient,
  AssetType,
  NetworkType,
  WalletType,
  WalletStatus,
} from '@prisma/client';

// Adjust this import to your file path:
import { CRYPTO_ASSETS_CONFIG } from '../src/lib/crypto-assets-config';

// Optional: load a JSON with KMS signatureIds/xpubs you generate (see section 3)
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

// ---- Normalization maps ----
const NETWORK_CODE_MAP: Record<string, string> = {
  binance_smart_chain: 'bsc',
  bsc: 'bsc',
  ethereum: 'ethereum',
  tron: 'tron',
  bitcoin: 'bitcoin',
  polygon: 'polygon',
  solana: 'solana',
  litecoin: 'litecoin',
  dogecoin: 'dogecoin',
};

const NETWORK_NAME: Record<string, string> = {
  bsc: 'BNB Smart Chain',
  ethereum: 'Ethereum Mainnet',
  tron: 'TRON',
  bitcoin: 'Bitcoin',
  polygon: 'Polygon',
  solana: 'Solana',
  litecoin: 'Litecoin',
  dogecoin: 'Dogecoin',
};

const NETWORK_TYPE: Record<string, NetworkType> = {
  bsc: NetworkType.EVM,
  ethereum: NetworkType.EVM,
  polygon: NetworkType.EVM,
  tron: NetworkType.TRON,
  bitcoin: NetworkType.UTXO,
  litecoin: NetworkType.UTXO,
  dogecoin: NetworkType.UTXO,
  solana: NetworkType.SOLANA,
};

const EVM_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
};

const TATUM_CHAIN_ID: Record<string, string> = {
  bsc: 'bsc',
  ethereum: 'ethereum',
  tron: 'tron',
  bitcoin: 'bitcoin',
  polygon: 'polygon',
  solana: 'solana',
  litecoin: 'litecoin',
  dogecoin: 'dogecoin',
};

const STD_MAP: Record<string, string> = {
  BEP20: 'BEP-20',
  ERC20: 'ERC-20',
  TRC20: 'TRC-20',
  Polygon: 'ERC-20', // normalize polygon tokens to ERC-20
};

const DEFAULT_CONFIRMATIONS: Record<string, number> = {
  bitcoin: 6,
  litecoin: 6,
  dogecoin: 6,
  ethereum: 6,
  bsc: 12,
  polygon: 128, // polygon finality often > 128 blocks in practice; tune to your policy
  tron: 20,
  solana: 32,
};

// Optional derivation paths (informational; KMS can derive w/o you persisting this)
const DERIVATION_PATH: Record<string, string> = {
  // EVM
  ethereum: `m/44'/60'/0'/0`,
  bsc: `m/44'/60'/0'/0`,
  polygon: `m/44'/60'/0'/0`,
  // UTXO (BIP44 coin types)
  bitcoin: `m/44'/0'/0'/0`,
  litecoin: `m/44'/2'/0'/0`,
  dogecoin: `m/44'/3'/0'/0`,
  // Others
  tron: `m/44'/195'/0'/0/0`,
  solana: `m/44'/501'/0'/0'`,
};

// Small helper to safely read KMS pairs
type KmsWallets = Record<
  string /* network code */,
  Record<string /* asset symbol */, { signatureId: string; xpub?: string }>
>;

function loadKms(): KmsWallets {
  const p = path.join(process.cwd(), 'kms.wallets.json');
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function upsertNetwork(
  code: string,
  exemplar?: {
    explorerUrl?: string;
  },
) {
  const name = NETWORK_NAME[code] ?? code;
  const type = NETWORK_TYPE[code];
  const confirmations = DEFAULT_CONFIRMATIONS[code] ?? 6;
  const tatumChainId = TATUM_CHAIN_ID[code];

  return prisma.network.upsert({
    where: { code },
    update: {
      name,
      type,
      blockConfirmations: confirmations,
      tatumChainId,
      explorerUrl: exemplar?.explorerUrl,
      isActive: true,
    },
    create: {
      code,
      name,
      type,
      blockConfirmations: confirmations,
      tatumChainId,
      explorerUrl: exemplar?.explorerUrl,
      isActive: true,
    },
  });
}

async function upsertAsset(
  symbol: string,
  p: {
    name: string;
    isNative: boolean;
    decimals: number;
    logoUrl?: string;
    coinGeckoId?: string;
    coinMarketCapId?: string;
  },
) {
  const type = p.isNative ? AssetType.NATIVE : AssetType.TOKEN;
  return prisma.asset.upsert({
    where: { symbol },
    update: {
      name: p.name,
      type,
      logoUrl: p.logoUrl,
      isActive: true,
    },
    create: {
      symbol,
      name: p.name,
      type,
      logoUrl: p.logoUrl,
      isActive: true,
    },
  });
}

async function upsertAssetNetwork(
  assetId: string,
  networkId: string,
  p: {
    contractAddress?: string | null;
    decimals: number;
    tokenStandard?: string | null;
  },
) {
  return prisma.assetNetwork.upsert({
    where: { assetId_networkId: { assetId, networkId } },
    update: {
      contractAddress: p.contractAddress ?? null,
      decimals: p.decimals,
      tokenStandard: p.tokenStandard ?? null,
      isActive: true,
    },
    create: {
      assetId,
      networkId,
      contractAddress: p.contractAddress ?? null,
      decimals: p.decimals,
      tokenStandard: p.tokenStandard ?? null,
      isActive: true,
    },
  });
}

async function upsertSystemWallet(
  assetNetworkId: string,
  networkId: string,
  p: {
    signatureId?: string;
    xpub?: string;
    derivationPath?: string;
  },
) {
  if (!p.signatureId) return null; // skip until you fill kms.wallets.json
  return prisma.kmsWallet.upsert({
    where: {
      networkId_signatureId: {
        networkId,
        signatureId: p.signatureId
      }
    },
    update: {
      xpub: p.xpub,
      derivationPath: p.derivationPath ?? `m/44'/60'/0'/0`,
      status: WalletStatus.ACTIVE,
    },
    create: {
      networkId,
      signatureId: p.signatureId,
      xpub: p.xpub,
      derivationPath: p.derivationPath ?? `m/44'/60'/0'/0`,
      nextAddressIndex: BigInt(0),
      status: WalletStatus.PENDING_SETUP,
    },
  });
}

async function main() {
  const kms = loadKms();

  // 1) Collect network exemplars for explorer URLs
  const exemplarByCode: Record<string, { explorerUrl?: string }> = {};

  // 2) First pass: upsert networks
  for (const asset of Object.values(CRYPTO_ASSETS_CONFIG)) {
    for (const n of asset.networks) {
      const code = NETWORK_CODE_MAP[n.network] ?? n.network;
      exemplarByCode[code] ||= { explorerUrl: n.explorerUrl };
    }
  }
  const networkRows: Record<string, { id: string }> = {};
  for (const code of Object.keys(exemplarByCode)) {
    const row = await upsertNetwork(code, exemplarByCode[code]);
    networkRows[code] = { id: row.id };
  }

  // 3) Assets + AssetNetworks
  const assetRows: Record<string, { id: string }> = {};
  for (const [symbol, cfg] of Object.entries(CRYPTO_ASSETS_CONFIG)) {
    const isNative = cfg.networks.some((n) => n.isNative);
    const asset = await upsertAsset(symbol, {
      name: cfg.name,
      isNative,
      decimals: cfg.decimals,
      logoUrl: cfg.icon,
      coinGeckoId: cfg.coinGeckoId,
      coinMarketCapId: cfg.coinMarketCapId,
    });
    assetRows[symbol] = { id: asset.id };

    for (const n of cfg.networks) {
      const code = NETWORK_CODE_MAP[n.network] ?? n.network;
      const networkId = networkRows[code]?.id;
      if (!networkId) continue;

      const tokenStandard = n.tokenStandard
        ? (STD_MAP[n.tokenStandard] ?? n.tokenStandard)
        : null;
      const an = await upsertAssetNetwork(asset.id, networkId, {
        contractAddress: n.isNative ? null : n.contractAddress,
        decimals: cfg.decimals,
        tokenStandard,
      });

      // 4) SystemWallets (optional, if kms.wallets.json has entries)
      const kmsEntry = kms[code]?.[symbol];
      await upsertSystemWallet(an.id, networkId, {
        signatureId: kmsEntry?.signatureId,
        xpub: kmsEntry?.xpub,
        derivationPath: DERIVATION_PATH[code],
      });
    }
  }

  console.log('✅ Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
