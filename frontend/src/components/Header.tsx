import { useSwapStore } from '../stores/swapStore';

interface HeaderProps {
  view: 'swap' | 'history';
  setView: (view: 'swap' | 'history') => void;
}

export function Header({ view, setView }: HeaderProps) {
  const { wallet, disconnectWallets } = useSwapStore();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <span className="bg-kaspa text-white px-2 py-1 rounded text-sm font-bold">KAS</span>
              <span className="text-gray-400">↔</span>
              <span className="bg-eth text-white px-2 py-1 rounded text-sm font-bold">ETH</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Stroemnet</h1>
          </div>
          
          <nav className="flex items-center gap-4">
            <button
              onClick={() => setView('swap')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'swap' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Swap
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'history' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              History
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {wallet.kaspa.connected && (
              <span className="text-sm text-kaspa">KAS: {wallet.kaspa.address?.slice(0, 8)}...</span>
            )}
            {wallet.eth.connected && (
              <span className="text-sm text-eth">ETH: {wallet.eth.address?.slice(0, 8)}...</span>
            )}
            {(wallet.kaspa.connected || wallet.eth.connected) && (
              <button
                onClick={disconnectWallets}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
