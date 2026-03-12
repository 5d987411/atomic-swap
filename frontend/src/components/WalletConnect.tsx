import { useKaspaWallet } from '../hooks/useKaspaWallet';
import { useEthWallet } from '../hooks/useEthWallet';
import { useSwapStore } from '../stores/swapStore';

export function WalletConnect() {
  const { setKaspaWallet, setEthWallet } = useSwapStore();
  const kaspa = useKaspaWallet('testnet');
  const eth = useEthWallet('testnet');

  const connectKaspa = async () => {
    await kaspa.connect();
    if (kaspa.state.address) {
      setKaspaWallet(kaspa.state.address, kaspa.state.balance || '0');
    }
  };

  const connectEth = async () => {
    await eth.connect();
    if (eth.state.address) {
      setEthWallet(eth.state.address, eth.state.balance || '0', eth.state.chainId || 11155111);
    }
  };

  return (
    <div className="swap-card max-w-md mx-auto mt-12">
      <h2 className="text-2xl font-bold mb-6 text-center">Connect Wallets</h2>
      <p className="text-gray-600 mb-8 text-center">
        Connect your Kaspa and Ethereum wallets to start atomic swapping
      </p>
      
      <div className="space-y-4">
        <button
          onClick={connectKaspa}
          disabled={kaspa.state.loading || kaspa.state.connected}
          className="w-full py-3 px-4 bg-kaspa text-white rounded-lg font-medium 
                     hover:bg-orange-600 transition-colors flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-2xl">🦊</span>
          {kaspa.state.loading ? 'Connecting...' : kaspa.state.connected ? 'Kaspa Connected ✓' : 'Connect Kaspa Wallet'}
        </button>
        
        <button
          onClick={connectEth}
          disabled={eth.state.loading || eth.state.connected}
          className="w-full py-3 px-4 bg-eth text-white rounded-lg font-medium 
                     hover:bg-blue-700 transition-colors flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-2xl">🔷</span>
          {eth.state.loading ? 'Connecting...' : eth.state.connected ? 'Ethereum Connected ✓' : 'Connect Ethereum Wallet'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-2">Connection Status:</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Kaspa:</span>
            <span className={kaspa.state.connected ? 'text-green-600' : 'text-gray-400'}>
              {kaspa.state.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          {kaspa.state.address && (
            <div className="text-xs text-gray-500 truncate">
              Address: {kaspa.state.address}
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Ethereum:</span>
            <span className={eth.state.connected ? 'text-green-600' : 'text-gray-400'}>
              {eth.state.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          {eth.state.address && (
            <div className="text-xs text-gray-500 truncate">
              Address: {eth.state.address}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6 text-center">
        This is a non-custodial atomic swap. Your keys never leave your wallet.
      </p>
    </div>
  );
}
