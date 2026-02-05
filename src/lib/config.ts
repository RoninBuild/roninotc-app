export const config = {
  botApiUrl: process.env.NEXT_PUBLIC_BOT_API_URL || 'https://escrowronin-bot2v.onrender.com',
  factoryAddress: '0xc5A2751f45c03F487b33767cF9b9867907d0aEcE' as `0x${string}`,
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  chainId: 8453,
  explorerUrl: 'https://basescan.org',
  rpcUrl: 'https://mainnet.base.org',
}

export const APP_NAME = 'RoninOTC'
export const APP_DESCRIPTION = 'Trustless OTC escrow on Base'
