'use client';

import { PrivacyCash } from 'privacycash';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';

export function usePrivacyCash(
  connection: Connection | null,
  publicKey: PublicKey | null,
  signTransaction: ((tx: any) => Promise<any>) | null
): PrivacyCash | null {
  return useMemo(() => {
    if (!connection || !publicKey || !signTransaction) {
      return null;
    }

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    
    // Create a keypair wrapper that uses the wallet adapter's signTransaction
    const walletKeypair = {
      publicKey,
      signTransaction: async (tx: any) => {
        return await signTransaction(tx);
      }
    } as any;

    try {
      const client = new PrivacyCash({
        RPC_url: rpcUrl,
        owner: publicKey.toBytes(), // Pass public key bytes, SDK will handle signing via transactionSigner
        enableDebug: false
      });

      // Override the transactionSigner in deposit/withdraw methods
      // We'll need to handle this in the components
      return client;
    } catch (error) {
      console.error('Failed to initialize PrivacyCash:', error);
      return null;
    }
  }, [connection, publicKey, signTransaction]);
}

export async function createPrivacyCashClient(
  connection: Connection,
  keypair: Keypair
): Promise<PrivacyCash> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  
  return new PrivacyCash({
    RPC_url: rpcUrl,
    owner: keypair,
    enableDebug: false
  });
}

