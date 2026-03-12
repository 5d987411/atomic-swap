import { useState } from 'react';
import { useSwapStore } from './stores/swapStore';
import { WalletConnect } from './components/WalletConnect';
import { CreateIntent } from './components/CreateIntent';
import { SwapStatus } from './components/SwapStatus';
import { Header } from './components/Header';

function App() {
  const { wallet, session, resetSession } = useSwapStore();
  const [view, setView] = useState<'swap' | 'history'>('swap');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header view={view} setView={setView} />
      
      <main className="max-w-4xl mx-auto p-6">
        {!wallet.kaspa.connected || !wallet.eth.connected ? (
          <WalletConnect />
        ) : session ? (
          <SwapStatus onReset={resetSession} />
        ) : (
          <CreateIntent />
        )}
      </main>
    </div>
  );
}

export default App;
