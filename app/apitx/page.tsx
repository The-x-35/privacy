'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import WalletButton from '@/components/WalletButton';
import PublicBalanceCard from '@/components/PublicBalanceCard';
import PrivateSendFormApi from '@/components/PrivateSendFormApi';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export default function ApiTxPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch public wallet balances from RPC
  const fetchPublicBalances = async () => {
    if (!connection || !publicKey) return;

    setIsLoadingBalance(true);
    try {
      // Fetch SOL balance
      const sol = await connection.getBalance(publicKey);
      setSolBalance(sol);

      // Fetch USDC balance
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        const accountInfo = await getAccount(connection, usdcTokenAccount);
        setUsdcBalance(Number(accountInfo.amount));
      } catch (error) {
        // Token account doesn't exist, balance is 0
        setUsdcBalance(0);
      }
    } catch (error) {
      console.error('Failed to fetch public balances:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey && connection) {
      fetchPublicBalances();
    } else {
      setSolBalance(null);
      setUsdcBalance(null);
    }
  }, [connected, publicKey, connection]);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Private Send (API)</h1>
          <p className="text-gray-600 mb-4">
            Using REST API for private transactions
          </p>
          <WalletButton />
        </div>

        {connected ? (
          signTransaction ? (
            <>
              <div className="mb-6">
                <PublicBalanceCard
                  solBalance={solBalance}
                  usdcBalance={usdcBalance}
                  onRefresh={fetchPublicBalances}
                  isLoading={isLoadingBalance}
                />
              </div>

              <div>
                <PrivateSendFormApi
                  connection={connection}
                  publicKey={publicKey}
                  signTransaction={signTransaction}
                />
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <p className="text-yellow-800 text-lg">
                Your wallet does not support transaction signing. Please use a different wallet.
              </p>
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">Please connect your wallet to get started</p>
          </div>
        )}
      </div>
    </main>
  );
}

