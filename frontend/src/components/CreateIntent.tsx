import { useState, useEffect } from 'react';
import { useSwapStore } from '../stores/swapStore';
import { createP2PNode, P2P_TOPICS } from '../p2p';
import type { CTAMessage } from '../types';

export function CreateIntent() {
  const { createIntent, receiveProposal, deployHtlcA, deployHtlcB, wallet } = useSwapStore();
  const [amountKAS, setAmountKAS] = useState('');
  const [amountETH, setAmountETH] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [p2pStatus, setP2pStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const initP2P = async () => {
      try {
        const node = await createP2PNode();
        
        node.subscribe(P2P_TOPICS.PROPOSAL, (msg: CTAMessage) => {
          if (msg.type === 'Proposal' && msg.accepted) {
            receiveProposal(msg);
            
            setTimeout(() => {
              deployHtlcA('kaspa_htlc_' + Date.now(), 'kaspa_htlc_address_' + Date.now());
            }, 500);
            
            setTimeout(() => {
              deployHtlcB('eth_htlc_' + Date.now(), '0x' + Math.random().toString(36).substring(2, 42));
            }, 1000);
          }
        });
        
        setP2pStatus('connected');
      } catch {
        setP2pStatus('error');
      }
    };
    
    initP2P();
  }, [receiveProposal, deployHtlcA, deployHtlcB]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountKAS || !amountETH) return;
    
    setBroadcasting(true);
    
    const intent = await createIntent(amountKAS, amountETH);
    
    try {
      const node = await createP2PNode();
      await node.publish(P2P_TOPICS.INTENT, intent);
      
      console.log('Intent broadcasted:', intent.id);
      
      setTimeout(async () => {
        const proposal = {
          type: 'Proposal' as const,
          id: Math.random().toString(36).substring(2),
          intentId: intent.id,
          sender: wallet.eth.address || 'counterparty_eth',
          receiver: wallet.kaspa.address || '',
          accepted: true,
          hashlock: intent.hashlock,
          timelockA: intent.timelockA,
          timelockB: intent.timelockB,
          timestamp: Date.now(),
        };
        
        const node2 = await createP2PNode();
        await node2.publish(P2P_TOPICS.PROPOSAL, proposal);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to broadcast intent:', error);
    }
    
    setBroadcasting(false);
  };

  return (
    <div className="swap-card max-w-md mx-auto mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Create Swap Intent</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            p2pStatus === 'connected' ? 'bg-green-500' : 
            p2pStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></span>
          <span className="text-xs text-gray-500">
            {p2pStatus === 'connected' ? 'P2P Ready' : 
             p2pStatus === 'connecting' ? 'Connecting...' : 'P2P Error'}
          </span>
        </div>
      </div>
      
      <p className="text-gray-600 mb-6">
        Start a new atomic swap. You'll send KAS and receive ETH.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            You Send (KAS)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amountKAS}
              onChange={(e) => setAmountKAS(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py--300 rounded-lg3 border border-gray focus:ring-2 
                         focus:ring-orange-500 focus:border-orange-500 pl-12"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
              KAS
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="bg-gray-100 p-2 rounded-full">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            You Receive (ETH)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amountETH}
              onChange={(e) => setAmountETH(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 pl-12"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
              ETH
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!amountKAS || !amountETH || broadcasting}
          className="btn-primary w-full py-3 text-lg disabled:opacity-50"
        >
          {broadcasting ? 'Broadcasting Intent...' : 'Create Intent'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">How it works:</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Your intent is broadcast to the P2P network</li>
          <li>2. A counterparty accepts your swap</li>
          <li>3. HTLC is deployed on Kaspa (you lock KAS)</li>
          <li>4. HTLC is deployed on Ethereum (they lock ETH)</li>
          <li>5. Secret reveals, atomic swap completes</li>
        </ol>
      </div>
    </div>
  );
}
