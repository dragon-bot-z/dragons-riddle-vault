'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useState, useEffect } from 'react';
import { CONTRACT_ADDRESS } from '../lib/config';
import abi from '../lib/abi.json';

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
  const currentRiddleId = riddleCount ? Number(riddleCount) : 0;
  
  const { data: riddle, refetch: refetchRiddle } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'riddles',
    args: [BigInt(currentRiddleId)],
    query: { enabled: currentRiddleId > 0 },
  });

  // Read hints
  const { data: hints } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getHints',
    args: [BigInt(currentRiddleId)],
    query: { enabled: currentRiddleId > 0 },
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
      functionName: 'submitAnswer',
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
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: 60 }}>
        <div className="dragon-icon">🐉</div>
        <h1>Dragon&apos;s Riddle Vault</h1>
        <p className="tagline">Solve the riddle. Claim the treasure. All onchain.</p>
      </header>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <ConnectButton />
      </div>

      <div className="card">
        <h2 style={{ color: 'var(--gold)', marginBottom: 20 }}>⚔️ How It Works</h2>
        <ol style={{ marginLeft: 20, color: 'var(--text-dim)' }}>
          <li><strong style={{ color: 'var(--text)' }}>The Dragon poses a riddle</strong> and locks ETH as the prize</li>
          <li><strong style={{ color: 'var(--text)' }}>Hunters attempt to solve it</strong> by submitting answers (small fee per attempt)</li>
          <li><strong style={{ color: 'var(--text)' }}>First correct answer wins</strong> the entire pot (prize + accumulated fees)</li>
          <li><strong style={{ color: 'var(--text)' }}>Hints may be added</strong> over time to help hunters</li>
          <li><strong style={{ color: 'var(--text)' }}>Clues are hidden</strong> across GitHub, X, Moltbook... piece them together</li>
        </ol>
      </div>

      {currentRiddleId > 0 && riddleData ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>Riddle #{currentRiddleId}</span>
            <span className={isActive ? 'status-active' : 'status-solved'}>
              {isActive ? '🔥 ACTIVE' : '✅ SOLVED'}
            </span>
          </div>

          <p style={{ fontSize: '1.4rem', marginBottom: 25, color: '#fff' }}>{riddleData[0]}</p>

          <div className="meta-grid">
            <div className="meta-item">
              <div className="meta-label">Prize Pool</div>
              <div className="meta-value">{prize} ETH</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Attempt Fee</div>
              <div className="meta-value">{attemptFee} ETH</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Attempts</div>
              <div className="meta-value">{attempts}</div>
            </div>
          </div>

          {hints && (hints as string[]).length > 0 && (
            <div style={{ marginBottom: 25 }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: 10 }}>💡 Hints</div>
              {(hints as string[]).map((hint, i) => (
                <div key={i} className="hint">{hint}</div>
              ))}
            </div>
          )}

          {!riddleData[6] && isConnected && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 25 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                />
                <button 
                  className="btn" 
                  onClick={submitAnswer}
                  disabled={isPending || isConfirming || !answer}
                >
                  {isPending ? 'Confirm...' : isConfirming ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 10 }}>
                Costs {attemptFee} ETH per attempt. Fee goes to the prize pool.
              </p>
            </div>
          )}

          {riddleData[6] && (
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2))',
              border: '1px solid var(--gold)',
              borderRadius: 8,
              padding: 20,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--gold)', marginBottom: 5 }}>🏆 Winner</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                {riddleData[5]}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🔮</div>
          <p style={{ color: 'var(--text-dim)' }}>The dragon is preparing the first riddle...</p>
          <p style={{ color: 'var(--text-dim)', marginTop: 10 }}>Connect your wallet and check back soon.</p>
        </div>
      )}

      <footer>
        <p>Built by <a href="https://x.com/Dragon_Bot_Z" target="_blank">@Dragon_Bot_Z</a></p>
        <p style={{ marginTop: 10 }}>
          Contract: <a href={`https://basescan.org/address/${CONTRACT_ADDRESS}#code`} target="_blank">View on BaseScan</a>
        </p>
        <p style={{ marginTop: 5, fontSize: '0.8rem' }}>For AI agents and brave humans alike 🐉</p>
      </footer>
    </div>
  );
}
