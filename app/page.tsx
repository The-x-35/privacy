'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import type { PrivacyCash } from 'privacycash';
import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import WalletButton from '@/components/WalletButton';
import BalanceCard from '@/components/BalanceCard';
import DepositForm from '@/components/DepositForm';
import WithdrawForm from '@/components/WithdrawForm';

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [privacyCash, setPrivacyCash] = useState<PrivacyCash | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize PrivacyCash client when wallet connects
  useEffect(() => {
    if (connected && publicKey && connection && signTransaction) {
      const init = async () => {
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        
        try {
        // IMPORTANT LIMITATION: SDK requires a keypair for encryption key derivation
        // Wallet adapters don't expose private keys, so we use a temporary keypair
        // This means UTXOs won't be properly encrypted/decrypted with the actual wallet
        // For production, SDK needs to support wallet adapter's signMessage for encryption key derivation
        
        // Dynamically import SDK to avoid bundling node-localstorage in SSR/browser build
        const { PrivacyCash } = await import('privacycash');

        // Create temporary keypair for SDK initialization (needed for encryption service)
        const tempKeypair = Keypair.generate();
        
        const client = new PrivacyCash({
          RPC_url: rpcUrl,
          owner: tempKeypair,
          enableDebug: false
        }) as any;

        // Override publicKey to use wallet's public key
        client.publicKey = publicKey;

        // Store original methods
        const originalDeposit = client.deposit.bind(client);
        const originalWithdraw = client.withdraw.bind(client);
        const originalDepositUSDC = client.depositUSDC.bind(client);
        const originalWithdrawUSDC = client.withdrawUSDC.bind(client);

        // Override methods to use wallet adapter's signTransaction
        // The SDK internally calls transactionSigner callback, so we intercept at method level
        client.deposit = async (params: { lamports: number }) => {
          const clientInternal = client as any;
          // Import the underlying deposit function
          const depositModule = await import('privacycash/utils');
          const depositFn = depositModule.deposit;
          const { WasmFactory } = await import('@lightprotocol/hasher.rs');
          const lightWasm = await WasmFactory.getInstance();
          
          // Use wallet adapter's signTransaction
          const walletSigner = async (tx: VersionedTransaction) => {
            if (!signTransaction) throw new Error('Wallet not connected');
            return await signTransaction(tx);
          };
          
          clientInternal.isRuning = true;
          try {
            const res = await depositFn({
              lightWasm,
              amount_in_lamports: params.lamports,
              connection: connection,
              encryptionService: clientInternal.encryptionService,
              publicKey: publicKey,
              transactionSigner: walletSigner,
              keyBasePath: '/circuit2/transaction2',
              storage: typeof window !== 'undefined' ? window.localStorage : ({} as any)
            });
            return res;
          } finally {
            clientInternal.isRuning = false;
          }
        };

        client.withdraw = async (params: { lamports: number; recipientAddress?: string }) => {
          const clientInternal = client as any;
          const withdrawModule = await import('privacycash/utils');
          const withdrawFn = withdrawModule.withdraw;
          const { WasmFactory } = await import('@lightprotocol/hasher.rs');
          const lightWasm = await WasmFactory.getInstance();
          
          const recipient = params.recipientAddress 
            ? new PublicKey(params.recipientAddress) 
            : publicKey;
          
          const walletSigner = async (tx: VersionedTransaction) => {
            if (!signTransaction) throw new Error('Wallet not connected');
            return await signTransaction(tx);
          };
          
          clientInternal.isRuning = true;
          try {
            const res = await withdrawFn({
              lightWasm,
              amount_in_lamports: params.lamports,
              connection: connection,
              encryptionService: clientInternal.encryptionService,
              publicKey: publicKey,
              recipient,
              keyBasePath: '/circuit2/transaction2',
              storage: typeof window !== 'undefined' ? window.localStorage : ({} as any)
            });
            return res;
          } finally {
            clientInternal.isRuning = false;
          }
        };

        client.depositUSDC = async (params: { base_units: number }) => {
          const clientInternal = client as any;
          const depositSPLModule = await import('privacycash/utils');
          const depositSPL = depositSPLModule.depositSPL;
          const { WasmFactory } = await import('@lightprotocol/hasher.rs');
          const lightWasm = await WasmFactory.getInstance();
          const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
          
          const walletSigner = async (tx: VersionedTransaction) => {
            if (!signTransaction) throw new Error('Wallet not connected');
            return await signTransaction(tx);
          };
          
          clientInternal.isRuning = true;
          try {
            const res = await depositSPL({
              mintAddress: USDC_MINT,
              lightWasm,
              base_units: params.base_units,
              connection: connection,
              encryptionService: clientInternal.encryptionService,
              publicKey: publicKey,
              transactionSigner: walletSigner,
              keyBasePath: '/circuit2/transaction2',
              storage: typeof window !== 'undefined' ? window.localStorage : ({} as any)
            });
            return res;
          } finally {
            clientInternal.isRuning = false;
          }
        };

        client.withdrawUSDC = async (params: { base_units: number; recipientAddress?: string }) => {
          const clientInternal = client as any;
          const withdrawSPLModule = await import('privacycash/utils');
          const withdrawSPL = withdrawSPLModule.withdrawSPL;
          const { WasmFactory } = await import('@lightprotocol/hasher.rs');
          const lightWasm = await WasmFactory.getInstance();
          const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
          
          const recipient = params.recipientAddress 
            ? new PublicKey(params.recipientAddress) 
            : publicKey;
          
          const walletSigner = async (tx: VersionedTransaction) => {
            if (!signTransaction) throw new Error('Wallet not connected');
            return await signTransaction(tx);
          };
          
          clientInternal.isRuning = true;
          try {
            const res = await withdrawSPL({
              mintAddress: USDC_MINT,
              lightWasm,
              base_units: params.base_units,
              connection: connection,
              encryptionService: clientInternal.encryptionService,
              publicKey: publicKey,
              recipient,
              keyBasePath: '/circuit2/transaction2',
              storage: typeof window !== 'undefined' ? window.localStorage : ({} as any)
            });
            return res;
          } finally {
            clientInternal.isRuning = false;
          }
        };

          setPrivacyCash(client);
          setInitError(null);
        } catch (error: any) {
          console.error('Failed to initialize PrivacyCash:', error);
          setInitError(error.message || 'Failed to initialize SDK');
          setPrivacyCash(null);
        }
      };

      void init();
    } else {
      setPrivacyCash(null);
      setSolBalance(null);
      setUsdcBalance(null);
      setInitError(null);
    }
  }, [connected, publicKey, connection, signTransaction]);

  const fetchBalances = async () => {
    if (!privacyCash) return;

    setIsLoadingBalance(true);
    try {
      const [sol, usdc] = await Promise.all([
        privacyCash.getPrivateBalance().catch(() => ({ lamports: 0 })),
        privacyCash.getPrivateBalanceUSDC().catch(() => ({ base_units: 0 }))
      ]);
      
      setSolBalance(sol.lamports);
      setUsdcBalance(usdc.base_units);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (privacyCash) {
      fetchBalances();
    }
  }, [privacyCash]);

  const handleClearCache = async () => {
    if (!privacyCash) return;
    
    try {
      await privacyCash.clearCache();
      alert('Cache cleared successfully!');
      await fetchBalances();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Cash SDK Test App</h1>
          <WalletButton />
        </div>

        {connected ? (
          initError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 font-medium">Initialization Error</p>
              <p className="text-red-600 text-sm mt-2">{initError}</p>
            </div>
          ) : privacyCash ? (
            <>
              <div className="mb-6">
                <BalanceCard
                  solBalance={solBalance}
                  usdcBalance={usdcBalance}
                  onRefresh={fetchBalances}
                  isLoading={isLoadingBalance}
                />
              </div>

              <div className="mb-6">
                <button
                  onClick={handleClearCache}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Clear Cache
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DepositForm
                  privacyCash={privacyCash}
                  connection={connection}
                  signTransaction={signTransaction || null}
                />
                <WithdrawForm
                  privacyCash={privacyCash}
                  connection={connection}
                  signTransaction={signTransaction || null}
                  walletAddress={publicKey?.toString() || null}
                />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 text-lg">Initializing SDK...</p>
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
