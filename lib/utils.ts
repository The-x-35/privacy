export function formatSOL(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(9);
}

export function formatUSDC(baseUnits: number): string {
  return (baseUnits / 1_000_000).toFixed(6);
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

export function usdcToBaseUnits(usdc: number): number {
  return Math.floor(usdc * 1_000_000);
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

