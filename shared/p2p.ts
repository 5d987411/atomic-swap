import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@libp2p/noise';
import { mplex } from '@libp2p/mplex';
import { gossipsub } from '@libp2p/gossipsub';
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

let nodeInstance: any = null;
const subscriptions: Map<string, Set<(message: CTAMessage) => void>> = new Map();

export async function createP2PNode(topic: string = 'stroemnet-swap'): Promise<P2PNode> {
  if (nodeInstance) {
    try {
      await nodeInstance.stop();
    } catch {}
    nodeInstance = null;
  }

  try {
    const node = await createLibp2p({
      addresses: {
        listen: ['/webrtc'],
      },
      transports: [webSockets()],
      connectionEncryption: [noise()],
      streamMuxers: [mplex()],
      services: {
        pubsub: gossipsub({
          allowGossipToBeForwarded: true,
          allowToBeForwarded: true,
          emitSelf: false,
        }),
      },
    });

    await node.services.pubsub.subscribe(topic);
    nodeInstance = node;

    const publish = async (topicName: string, message: CTAMessage) => {
      if (!nodeInstance) throw new Error('P2P not connected');
      const data = new TextEncoder().encode(JSON.stringify(message));
      await nodeInstance.services.pubsub.publish(topicName, data);
    };

    const subscribe = (topicName: string, callback: (message: CTAMessage) => void) => {
      if (!subscriptions.has(topicName)) {
        subscriptions.set(topicName, new Set());
        nodeInstance?.services.pubsub.subscribe(topicName);
        
        nodeInstance?.services.pubsub.addEventListener('message', (event: any) => {
          if (event.detail.topic === topicName) {
            try {
              const message = JSON.parse(new TextDecoder().decode(event.detail.message)) as CTAMessage;
              subscriptions.get(topicName)?.forEach(cb => cb(message));
            } catch (e) {
              console.error('Failed to parse P2P message:', e);
            }
          }
        });
      }
      
      subscriptions.get(topicName)?.add(callback);
      
      return () => {
        subscriptions.get(topicName)?.delete(callback);
      };
    };

    const disconnect = async () => {
      if (nodeInstance) {
        await nodeInstance.stop();
        nodeInstance = null;
        subscriptions.clear();
      }
    };

    return {
      started: true,
      peerId: node.peerId.toString(),
      publish,
      subscribe,
      disconnect,
    };
  } catch (error) {
    console.warn('P2P initialization failed, using mock:', error);
    
    return createMockP2PNode();
  }
}

function createMockP2PNode(): P2PNode {
  const handlers: Map<string, Set<(message: CTAMessage) => void>> = new Map();
  
  return {
    started: false,
    peerId: 'mock-' + Math.random().toString(36).substring(10),
    
    publish: async (topic: string, message: CTAMessage) => {
      console.log('[Mock P2P] Publish:', topic, message.type);
      
      setTimeout(() => {
        handlers.get(topic)?.forEach(cb => cb(message));
      }, 50);
    },
    
    subscribe: (topic: string, callback: (message: CTAMessage) => void) => {
      if (!handlers.has(topic)) {
        handlers.set(topic, new Set());
      }
      handlers.get(topic)?.add(callback);
      
      console.log('[Mock P2P] Subscribed to:', topic);
      
      return () => {
        handlers.get(topic)?.delete(callback);
      };
    },
    
    disconnect: async () => {
      handlers.clear();
    },
  };
}

export type { CTAMessage, Intent, Proposal, Commitment, Reveal, Blacklist } from './types';
