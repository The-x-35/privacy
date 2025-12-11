'use client';

import { useState } from 'react';
import { PrivacyCash } from 'privacycash';
import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { solToLamports, usdcToBaseUnits } from '@/lib/utils';

interface PrivateSendFormProps {
  privacyCash: PrivacyCash | null;
  connection: Connection | null;
  signTransaction: ((tx: VersionedTransaction) => Promise<VersionedTransaction>) | null;
}

export default function PrivateSendForm({ privacyCash, connection, signTransaction }: PrivateSendFormProps) {
  const [activeTab, setActiveTab] = useState<'sol' | 'usdc'>('sol');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [solAmount, setSolAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'depositing' | 'withdrawing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [depositTx, setDepositTx] = useState<string | undefined>();
  const [withdrawTx, setWithdrawTx] = useState<string | undefined>();

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handlePrivateSend = async () => {
    if (!privacyCash || !connection || !signTransaction) {
      setStatus('error');
      setMessage('Wallet not connected');
      return;
    }

    if (!recipientAddress || !validateAddress(recipientAddress)) {
      setStatus('error');
      setMessage('Invalid recipient address');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Starting private send...');
      setDepositTx(undefined);
      setWithdrawTx(undefined);

      const client = privacyCash as any;

      if (activeTab === 'sol') {
        const lamports = solToLamports(parseFloat(solAmount));
        if (isNaN(lamports) || lamports <= 0) {
          throw new Error('Invalid SOL amount');
        }

        // Step 1: Deposit
        setStatus('depositing');
        setMessage('Depositing to Privacy Cash pool...');
        const depositResult = await client.deposit({ lamports });
        setDepositTx(depositResult.tx);
        setMessage('Deposit successful. Preparing withdrawal...');

        // Wait a bit for deposit to settle
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Withdraw to recipient
        setStatus('withdrawing');
        setMessage('Withdrawing to recipient address...');
        const withdrawResult = await client.withdraw({ 
          lamports,
          recipientAddress 
        });
        setWithdrawTx(withdrawResult.tx);
        
        setStatus('success');
        setMessage(`Successfully sent ${solAmount} SOL privately to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-8)}`);
        setSolAmount('');
        setRecipientAddress('');
      } else {
        const baseUnits = usdcToBaseUnits(parseFloat(usdcAmount));
        if (isNaN(baseUnits) || baseUnits <= 0) {
          throw new Error('Invalid USDC amount');
        }

        // Step 1: Deposit USDC
        setStatus('depositing');
        setMessage('Depositing USDC to Privacy Cash pool...');
        const depositResult = await client.depositUSDC({ base_units: baseUnits });
        setDepositTx(depositResult.tx);
        setMessage('Deposit successful. Preparing withdrawal...');

        // Wait a bit for deposit to settle
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Withdraw USDC to recipient
        setStatus('withdrawing');
        setMessage('Withdrawing USDC to recipient address...');
        const withdrawResult = await client.withdrawUSDC({ 
          base_units: baseUnits,
          recipientAddress 
        });
        setWithdrawTx(withdrawResult.tx);
        
        setStatus('success');
        setMessage(`Successfully sent ${usdcAmount} USDC privately to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-8)}`);
        setUsdcAmount('');
        setRecipientAddress('');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Private send failed');
      console.error('Private send error:', error);
    }
  };

  const getStatusMessage = () => {
    if (status === 'depositing') return message;
    if (status === 'withdrawing') return message;
    if (status === 'success') return message;
    if (status === 'error') return message;
    if (status === 'loading') return message;
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Send Privately</h2>
      
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab('sol')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'sol'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          SOL
        </button>
        <button
          onClick={() => setActiveTab('usdc')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'usdc'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          USDC
        </button>
      </div>

      {(status !== 'idle' || message) && (
        <div className={`p-4 rounded-lg mb-4 ${
          status === 'error' ? 'bg-red-50 border border-red-200' :
          status === 'success' ? 'bg-green-50 border border-green-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {(status === 'loading' || status === 'depositing' || status === 'withdrawing') && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
            {status === 'success' && (
              <div className="h-4 w-4 rounded-full bg-green-600"></div>
            )}
            {status === 'error' && (
              <div className="h-4 w-4 rounded-full bg-red-600"></div>
            )}
            <span className={status === 'error' ? 'text-red-800' : status === 'success' ? 'text-green-800' : 'text-blue-800'}>
              {getStatusMessage()}
            </span>
          </div>
          
          {depositTx && (
            <div className="mt-2">
              <a
                href={`https://solscan.io/tx/${depositTx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View Deposit Transaction →
              </a>
            </div>
          )}
          
          {withdrawTx && (
            <div className="mt-2">
              <a
                href={`https://solscan.io/tx/${withdrawTx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline font-medium"
              >
                View Withdraw Transaction (Final) →
              </a>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            placeholder="Enter recipient Solana address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount ({activeTab === 'sol' ? 'SOL' : 'USDC'})
          </label>
          <input
            type="number"
            step="any"
            value={activeTab === 'sol' ? solAmount : usdcAmount}
            onChange={(e) => activeTab === 'sol' ? setSolAmount(e.target.value) : setUsdcAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            placeholder={`Enter ${activeTab === 'sol' ? 'SOL' : 'USDC'} amount`}
          />
        </div>

        <button
          onClick={handlePrivateSend}
          disabled={
            status === 'loading' || 
            status === 'depositing' || 
            status === 'withdrawing' || 
            !privacyCash || 
            !recipientAddress || 
            (activeTab === 'sol' ? !solAmount : !usdcAmount)
          }
          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {status === 'depositing' ? 'Depositing...' : 
           status === 'withdrawing' ? 'Withdrawing...' : 
           status === 'loading' ? 'Processing...' : 
           `Send ${activeTab === 'sol' ? 'SOL' : 'USDC'} Privately`}
        </button>
      </div>
    </div>
  );
}

