'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function WalletButton() {
  const { connected } = useWallet();

  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      {connected && (
        <div className="text-sm text-gray-600">
          Wallet Connected
        </div>
      )}
    </div>
  );
}

