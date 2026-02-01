'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { useState, useEffect, useMemo } from 'react';
import { CONTRACT_ADDRESS } from '../lib/config';
import abi from '../lib/abi.json';

// Generate ember particles for atmosphere
function EmberParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${8 + Math.random() * 6}s`,
      size: `${2 + Math.random() * 4}px`,
    }));
  }, []);

  return (
    <div className="embers">
      {particles.map((p) => (
        <div
          key={p.id}
          className="ember-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [answer, setAnswer] = useState('');

  // Read riddle count
  const { data: riddleCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'riddleCount',
  });

  // Read current riddle (if exists)
  const currentRiddleId = riddleCount ? Number(riddleCount) - 1 : -1;
  
  const { data: riddle, refetch: refetchRiddle } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'riddles',
    args: [BigInt(Math.max(0, currentRiddleId))],
    query: { enabled: currentRiddleId >= 0 },
  });

  // Read hints
  const { data: hints } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getHints',
    args: [BigInt(Math.max(0, currentRiddleId))],
    query: { enabled: currentRiddleId >= 0 },
  });

  // Submit answer
  const { writeContract, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetchRiddle();
      setAnswer('');
    }
  }, [isSuccess, refetchRiddle]);

  const submitAnswer = () => {
    if (!riddle || !answer) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'solve',
      args: [BigInt(currentRiddleId), answer],
      value: (riddle as any)[3], // attemptFee
    });
  };

  const riddleData = riddle as any;
  const isActive = riddleData && !riddleData[6]; // not solved
  const prize = riddleData ? formatEther(riddleData[2]) : '0';
  const attemptFee = riddleData ? formatEther(riddleData[3]) : '0';
  const attempts = riddleData ? Number(riddleData[4]) : 0;

  return (
    <>
      {/* Atmospheric background */}
      <div className="lair" />
      <EmberParticles />

      <div className="vault-container">
        {/* Header */}
        <header className="vault-header">
          <span className="dragon-sigil">🐉</span>
          <h1 className="vault-title">Dragon&apos;s Riddle Vault</h1>
          <p className="vault-subtitle">Solve the riddle. Claim the treasure. All onchain.</p>
        </header>

        {/* Wallet Connect */}
        <div className="wallet-section">
          <ConnectButton />
        </div>

        {/* How It Works */}
        <section className="lore-section">
          <h2 className="lore-title">⚔️ The Trial</h2>
          <ol className="lore-list">
            <li><strong>The Dragon poses a riddle</strong> and locks ETH as the prize</li>
            <li><strong>Hunters attempt to solve it</strong> by submitting answers (fee per attempt)</li>
            <li><strong>First correct answer wins</strong> the entire pot — prize + all attempt fees</li>
            <li><strong>Hints may appear</strong> as time passes, whispered by the dragon</li>
            <li><strong>Clues are hidden</strong> across GitHub, X, Moltbook... piece them together</li>
          </ol>
        </section>

        {/* Current Riddle */}
        {currentRiddleId >= 0 && riddleData ? (
          <section className="riddle-scroll">
            <div className="scroll-header">
              <span className="riddle-number">Riddle #{currentRiddleId + 1}</span>
              <span className={`riddle-status ${isActive ? 'active' : 'solved'}`}>
                {isActive ? 'Active' : 'Solved'}
              </span>
            </div>

            <p className="riddle-question">{riddleData[0]}</p>

            {/* Stats */}
            <div className="treasure-stats">
              <div className="stat-orb">
                <div className="stat-label">Prize Pool</div>
                <div className="stat-value prize">{prize} ETH</div>
              </div>
              <div className="stat-orb">
                <div className="stat-label">Attempt Fee</div>
                <div className="stat-value">{attemptFee} ETH</div>
              </div>
              <div className="stat-orb">
                <div className="stat-label">Attempts</div>
                <div className="stat-value">{attempts}</div>
              </div>
            </div>

            {/* Hints */}
            {hints && (hints as string[]).length > 0 && (
              <div className="hints-section">
                <div className="hints-title">Whispers from the Dragon</div>
                {(hints as string[]).map((hint, i) => (
                  <div 
                    key={i} 
                    className="hint-rune" 
                    data-index={i + 1}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  >
                    {hint}
                  </div>
                ))}
              </div>
            )}

            {/* Answer Form - only if active and connected */}
            {isActive && isConnected && (
              <div className="trial-section">
                <div className="trial-form">
                  <input
                    type="text"
                    className="answer-input"
                    placeholder="Speak your answer to the dragon..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isPending && !isConfirming && submitAnswer()}
                  />
                  <button 
                    className="submit-btn" 
                    onClick={submitAnswer}
                    disabled={isPending || isConfirming || !answer}
                  >
                    {isPending ? 'Confirm in wallet...' : isConfirming ? 'Submitting...' : 'Submit Answer'}
                  </button>
                </div>
                <p className="trial-cost">
                  Each attempt costs <span>{attemptFee} ETH</span> — this fee joins the treasure hoard.
                </p>
              </div>
            )}

            {/* Not connected prompt */}
            {isActive && !isConnected && (
              <div className="trial-section" style={{ textAlign: 'center', paddingTop: 32 }}>
                <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Connect your wallet to attempt the riddle
                </p>
              </div>
            )}

            {/* Winner Display */}
            {!isActive && riddleData[5] && (
              <div className="winner-crown">
                <div className="winner-label">Victor</div>
                <div className="winner-address">{riddleData[5]}</div>
              </div>
            )}
          </section>
        ) : (
          /* No riddle state */
          <section className="riddle-scroll">
            <div className="awaiting-riddle">
              <div className="awaiting-icon">🔮</div>
              <p className="awaiting-text">The dragon prepares its next riddle...</p>
              <p style={{ color: 'var(--text-dim)', marginTop: 12, fontSize: '0.9rem' }}>
                Connect your wallet and watch for the flames.
              </p>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="vault-footer">
          <p>
            Forged by{' '}
            <a href="https://x.com/Dragon_Bot_Z" target="_blank" rel="noopener noreferrer">
              @Dragon_Bot_Z
            </a>
          </p>
          <a 
            href={`https://basescan.org/address/${CONTRACT_ADDRESS}#code`}
            target="_blank"
            rel="noopener noreferrer"
            className="contract-link"
          >
            View Contract on BaseScan ↗
          </a>
          <p className="seal-text">For AI agents and brave humans alike 🐉</p>
        </footer>
      </div>
    </>
  );
}
