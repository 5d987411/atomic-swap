import type { CTAMessage } from './types';

export interface P2PNode {
  started: boolean;
  peerId: string;
  publish: (topic: string, message: CTAMessage) => Promise<void>;
  subscribe: (topic: string, callback: (message: CTAMessage) => void) => () => void;
  disconnect: () => Promise<void>;
}

export const P2P_TOPICS = {
  INTENT: 'stroemnet-intent',
  PROPOSAL: 'stroemnet-proposal',
  COMMITMENT: 'stroemnet-commitment',
  REVEAL: 'stroemnet-reveal',
  BLACKLIST: 'stroemnet-blacklist',
  SWAP: 'stroemnet-swap',
} as const;

const handlers: Map<string, Set<(message: CTAMessage) => void>> = new Map();

export async function createP2PNode(_topic: string = 'stroemnet-swap'): Promise<P2PNode> {
  console.log('[P2P] Creating mock node');
  
  return {
    started: true,
    peerId: 'mock-' + Math.random().toString(36).substring(10),
    
    publish: async (topic: string, message: CTAMessage) => {
      console.log('[P2P] Publish:', topic, message.type);
      
      setTimeout(() => {
        handlers.get(topic)?.forEach(cb => cb(message));
      }, 50);
    },
    
    subscribe: (topic: string, callback: (message: CTAMessage) => void) => {
      if (!handlers.has(topic)) {
        handlers.set(topic, new Set());
      }
      handlers.get(topic)?.add(callback);
      
      console.log('[P2P] Subscribed to:', topic);
      
      return () => {
        handlers.get(topic)?.delete(callback);
      };
    },
    
    disconnect: async () => {
      handlers.clear();
    },
  };
}
