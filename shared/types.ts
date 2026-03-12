// Shared types for Stroemnet Atomic Swap Protocol
// Based on Paper Section 2.2 - CTA Messages

export type Chain = 'kaspa' | 'eth';

export type SwapState = 
  | 'IDLE'
  | 'INTENT_SENT'
  | 'PROPOSAL_RECEIVED'
  | 'HTLC_A_LOCKED'
  | 'HTLC_B_LOCKED'
  | 'CLAIMED'
  | 'REFUNDED'
  | 'FAILED';

// CTA Messages (Table 1 from paper)
export interface Intent {
  type: 'Intent';
  id: string;
  sender: string;
  amountKAS: string;
  amountETH: string;
  hashlock: string;
  timelockA: number; // TA in blocks
  timelockB: number; // TB in seconds
  timestamp: number;
}

export interface Proposal {
  type: 'Proposal';
  id: string;
  intentId: string;
  sender: string;
  receiver: string;
  accepted: boolean;
  hashlock: string;
  timelockA: number;
  timelockB: number;
  timestamp: number;
}

export interface Commitment {
  type: 'Commitment';
  id: string;
  chain: Chain;
  txid: string;
  htlcAddress: string;
  amount: string;
  hashlock: string;
  timelock: number;
  timestamp: number;
}

export interface Reveal {
  type: 'Reveal';
  id: string;
  swapId: string;
  preimage: string;
  timestamp: number;
}

export interface Blacklist {
  type: 'Blacklist';
  id: string;
  txid: string;
  reason: string;
  timestamp: number;
}

export type CTAMessage = Intent | Proposal | Commitment | Reveal | Blacklist;

// Swap session
export interface SwapSession {
  id: string;
  state: SwapState;
  secret?: string;
  hashlock?: string;
  timelockA: number;
  timelockB: number;
  amountKAS: string;
  amountETH: string;
  alice: string; // Kaspa side
  bob: string;   // ETH side
  htlcAKaspa?: HtlcInfo;
  htlcBETH?: HtlcInfo;
  createdAt: number;
  updatedAt: number;
}

export interface HtlcInfo {
  id: string;
  chain: Chain;
  txid: string;
  address: string;
  amount: string;
  hashlock: string;
  timelock: number;
  state: 'locked' | 'claimed' | 'refunded';
  createdAt: number;
}

// Wallet state
export interface WalletState {
  kaspa: {
    connected: boolean;
    address?: string;
    balance?: string;
  };
  eth: {
    connected: boolean;
    address?: string;
    balance?: string;
    chainId?: number;
  };
}

// Config
export interface SwapConfig {
  network: 'mainnet' | 'testnet';
  timelockABlocks: number;  // ~1 second per block on Kaspa
  timelockBSeconds: number;  // Should be TB < TA with safety buffer
  safetyBufferPercent: number;
}
