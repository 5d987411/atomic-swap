import { useSwapStore } from '../stores/swapStore';
import type { SwapState } from '../types';

interface SwapStatusProps {
  onReset: () => void;
}

const STATE_STEPS: { state: SwapState; label: string; description: string }[] = [
  { state: 'IDLE', label: 'Idle', description: 'Waiting to start' },
  { state: 'INTENT_SENT', label: 'Intent Sent', description: 'Broadcasting your swap intent' },
  { state: 'PROPOSAL_RECEIVED', label: 'Proposal Received', description: 'Counterparty accepted your swap' },
  { state: 'HTLC_A_LOCKED', label: 'HTLC A Locked', description: 'Kaspa HTLC has been deployed' },
  { state: 'HTLC_B_LOCKED', label: 'HTLC B Locked', description: 'Ethereum HTLC has been deployed' },
  { state: 'CLAIMED', label: 'Claimed', description: 'Swap completed successfully!' },
  { state: 'REFUNDED', label: 'Refunded', description: 'Swap was refunded' },
];

export function SwapStatus({ onReset }: SwapStatusProps) {
  const { session } = useSwapStore();

  if (!session) return null;

  const currentStepIndex = STATE_STEPS.findIndex((s) => s.state === session.state);

  return (
    <div className="swap-card max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Swap Status</h2>
        <span className={`state-badge ${
          session.state === 'CLAIMED' ? 'state-claimed' :
          session.state === 'REFUNDED' ? 'state-refunded' :
          session.state.includes('LOCKED') ? 'state-locked' : 'state-active'
        }`}>
          {session.state}
        </span>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-kaspa">{session.amountKAS} KAS</div>
            <div className="text-sm text-gray-500">You send</div>
          </div>
          <div className="text-gray-300">→</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-eth">{session.amountETH} ETH</div>
            <div className="text-sm text-gray-500">You receive</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-6">
          {STATE_STEPS.slice(1).map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.state} className="flex items-start gap-4 relative">
                <div className={`w-4 h-4 rounded-full z-10 flex-shrink-0 mt-1 ${
                  isCompleted ? 'bg-green-500' :
                  isCurrent ? 'bg-orange-500' :
                  'bg-gray-300'
                }`} />
                <div className={`${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-60' : 'opacity-40'}`}>
                  <div className="font-medium">{step.label}</div>
                  <div className="text-sm text-gray-500">{step.description}</div>
                  {isCurrent && step.state === 'HTLC_A_LOCKED' && session.htlcA && (
                    <div className="mt-2 text-xs text-gray-400">
                      HTLC: {session.htlcA.address.slice(0, 20)}...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(session.state === 'CLAIMED' || session.state === 'REFUNDED') && (
        <button
          onClick={onReset}
          className="mt-6 w-full btn-primary"
        >
          Start New Swap
        </button>
      )}

      {session.state === 'HTLC_A_LOCKED' && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="font-medium text-orange-800 mb-2">Action Required</h4>
          <p className="text-sm text-orange-700">
            Waiting for counterparty to deploy ETH HTLC. This typically takes 1-2 minutes.
          </p>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400 text-center">
        Swap ID: {session.id}
      </div>
    </div>
  );
}
