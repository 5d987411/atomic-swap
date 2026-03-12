import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  SwapSession, 
  WalletState, 
  Intent, 
  Proposal, 
  SwapConfig,
  Commitment,
  Reveal
} from '../types';
import { createP2PNode, P2P_TOPICS } from '../p2p';

export interface HTLCActions {
  deployKaspaHTLC: (amount: string, hashlock: string, timelock: number, receiver: string) => Promise<{ txid: string; address: string }>;
  deployEthHTLC: (amount: string, hashlock: string, timelock: number, bob: string) => Promise<string>;
  claimKaspaHTLC: (htlcId: string, preimage: string) => Promise<string>;
  claimEthHTLC: (preimage: string) => Promise<string>;
  refundKaspaHTLC: (htlcId: string) => Promise<string>;
  refundEthHTLC: () => Promise<string>;
}

interface SwapStore {
  config: SwapConfig;
  wallet: WalletState;
  session: SwapSession | null;
  p2pNode: any;
  setKaspaWallet: (address: string, balance: string) => void;
  setEthWallet: (address: string, balance: string, chainId: number) => void;
  disconnectWallets: () => void;
  createIntent: (amountKAS: string, amountETH: string) => Promise<Intent>;
  receiveProposal: (proposal: Proposal) => void;
  deployHtlcA: (txid: string, address: string) => void;
  deployHtlcB: (txid: string, address: string) => void;
  claimSwap: (preimage: string) => void;
  refundSwap: () => void;
  resetSession: () => void;
  broadcastIntent: (intent: Intent) => Promise<void>;
  broadcastCommitment: (commitment: Commitment) => Promise<void>;
  broadcastReveal: (reveal: Reveal) => Promise<void>;
  subscribeToProposals: (callback: (proposal: Proposal) => void) => () => void;
  subscribeToCommitments: (callback: (commitment: Commitment) => void) => () => void;
  subscribeToReveals: (callback: (reveal: Reveal) => void) => () => void;
}

const DEFAULT_CONFIG: SwapConfig = {
  network: 'testnet',
  timelockABlocks: 1440,
  timelockBSeconds: 1200,
  safetyBufferPercent: 20,
};

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function computeHashlock(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  return crypto.subtle.digest('SHA-256', data)
    .then(buffer => Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0')).join(''));
}

export const useSwapStore = create<SwapStore>((set: any, get: any) => ({
  config: DEFAULT_CONFIG,
  
  wallet: {
    kaspa: { connected: false },
    eth: { connected: false },
  },
  
  session: null,
  p2pNode: null,
  
  setKaspaWallet: (address: string, balance: string) => set((state: any) => ({
    wallet: { ...state.wallet, kaspa: { connected: true, address, balance } },
  })),
  
  setEthWallet: (address: string, balance: string, chainId: number) => set((state: any) => ({
    wallet: { ...state.wallet, eth: { connected: true, address, balance, chainId } },
  })),
  
  disconnectWallets: () => set({
    wallet: { kaspa: { connected: false }, eth: { connected: false } },
  }),

  deployKaspaHTLC: async (amount: string, hashlock: string, timelock: number, receiver: string) => {
    const { wallet } = get();
    if (!wallet.kaspa.connected || !wallet.kaspa.address) {
      throw new Error('Kaspa wallet not connected');
    }

    console.log('[HTLC] Deploying Kaspa HTLC:', { amount, hashlock, timelock, receiver });

    const txid = 'kaspa_tx_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    const address = 'kaspa_htlc_' + hashlock.substring(0, 16);

    return { txid, address };
  },

  deployEthHTLC: async (amount: string, hashlock: string, timelock: number, bob: string) => {
    const { wallet } = get();
    if (!wallet.eth.connected || !wallet.eth.address) {
      throw new Error('ETH wallet not connected');
    }

    console.log('[HTLC] Deploying ETH HTLC:', { amount, hashlock, timelock, bob });

    const address = '0x' + Math.random().toString(36).substring(2, 42);

    return address;
  },

  claimKaspaHTLC: async (htlcId: string, preimage: string) => {
    console.log('[HTLC] Claiming Kaspa HTLC:', { htlcId, preimage });
    return 'kaspa_claim_tx_' + Date.now();
  },

  claimEthHTLC: async (preimage: string) => {
    console.log('[HTLC] Claiming ETH HTLC with preimage:', preimage);
    return '0x' + Math.random().toString(36).substring(2, 66);
  },

  refundKaspaHTLC: async (htlcId: string) => {
    console.log('[HTLC] Refunding Kaspa HTLC:', htlcId);
    return 'kaspa_refund_tx_' + Date.now();
  },

  refundEthHTLC: async () => {
    console.log('[HTLC] Refunding ETH HTLC');
    return '0x' + Math.random().toString(36).substring(2, 66);
  },
  
  createIntent: async (amountKAS: string, amountETH: string): Promise<Intent> => {
    const { config, wallet } = get();
    
    const secret = generateSecret();
    const hashlock = await computeHashlock(secret);
    
    const intent: Intent = {
      type: 'Intent',
      id: uuidv4(),
      sender: wallet.kaspa.address || '',
      amountKAS,
      amountETH,
      hashlock,
      timelockA: config.timelockABlocks,
      timelockB: config.timelockBSeconds,
      timestamp: Date.now(),
    };
    
    const session: SwapSession = {
      id: uuidv4(),
      state: 'INTENT_SENT',
      secret,
      hashlock,
      timelockA: config.timelockABlocks,
      timelockB: config.timelockBSeconds,
      amountKAS,
      amountETH,
      alice: intent.sender,
      bob: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    set({ session });
    return intent;
  },
  
  receiveProposal: (proposal: Proposal) => set((state: any) => ({
    session: state.session ? {
      ...state.session,
      state: 'PROPOSAL_RECEIVED',
      bob: proposal.sender,
      updatedAt: Date.now(),
    } : null,
  })),
  
  deployHtlcA: (txid: string, address: string) => set((state: any) => ({
    session: state.session ? {
      ...state.session,
      state: 'HTLC_A_LOCKED',
      htlcAKaspa: {
        id: txid,
        chain: 'kaspa',
        txid,
        address,
        amount: state.session.amountKAS,
        hashlock: state.session.hashlock || '',
        timelock: state.session.timelockA,
        state: 'locked',
        createdAt: Date.now(),
      },
      updatedAt: Date.now(),
    } : null,
  })),
  
  deployHtlcB: (txid: string, address: string) => set((state: any) => ({
    session: state.session ? {
      ...state.session,
      state: 'HTLC_B_LOCKED',
      htlcBETH: {
        id: txid,
        chain: 'eth',
        txid,
        address,
        amount: state.session.amountETH,
        hashlock: state.session.hashlock || '',
        timelock: state.session.timelockB,
        state: 'locked',
        createdAt: Date.now(),
      },
      updatedAt: Date.now(),
    } : null,
  })),
  
  claimSwap: (preimage: string) => set((state: any) => ({
    session: state.session ? {
      ...state.session,
      state: 'CLAIMED',
      secret: preimage,
      htlcAKaspa: state.session.htlcAKaspa ? { ...state.session.htlcAKaspa, state: 'claimed' } : undefined,
      htlcBETH: state.session.htlcBETH ? { ...state.session.htlcBETH, state: 'claimed' } : undefined,
      updatedAt: Date.now(),
    } : null,
  })),
  
  refundSwap: () => set((state: any) => ({
    session: state.session ? {
      ...state.session,
      state: 'REFUNDED',
      htlcAKaspa: state.session.htlcAKaspa ? { ...state.session.htlcAKaspa, state: 'refunded' } : undefined,
      htlcBETH: state.session.htlcBETH ? { ...state.session.htlcBETH, state: 'refunded' } : undefined,
      updatedAt: Date.now(),
    } : null,
  })),
  
  resetSession: () => set({ session: null }),

  broadcastIntent: async (intent: Intent) => {
    let { p2pNode } = get();
    if (!p2pNode) {
      p2pNode = await createP2PNode();
      set({ p2pNode });
    }
    await p2pNode.publish(P2P_TOPICS.INTENT, intent);
  },

  broadcastCommitment: async (commitment: Commitment) => {
    let { p2pNode } = get();
    if (!p2pNode) {
      p2pNode = await createP2PNode();
      set({ p2pNode });
    }
    await p2pNode.publish(P2P_TOPICS.COMMITMENT, commitment);
  },

  broadcastReveal: async (reveal: Reveal) => {
    let { p2pNode } = get();
    if (!p2pNode) {
      p2pNode = await createP2PNode();
      set({ p2pNode });
    }
    await p2pNode.publish(P2P_TOPICS.REVEAL, reveal);
  },

  subscribeToProposals: (_callback: (proposal: Proposal) => void) => {
    return () => {};
  },

  subscribeToCommitments: (_callback: (commitment: Commitment) => void) => {
    return () => {};
  },

  subscribeToReveals: (_callback: (reveal: Reveal) => void) => {
    return () => {};
  },
}));

export { generateSecret, computeHashlock };
