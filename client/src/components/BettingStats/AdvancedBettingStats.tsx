import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Eye, DollarSign, Calculator } from 'lucide-react';
import type { RoundBets } from '@/types/game';
import './AdvancedBettingStats.css';

interface AdvancedBettingStatsProps {
  round1Bets: RoundBets;
  round2Bets: RoundBets;
  currentRound: 1 | 2 | 3;
  isGameActive: boolean;
}

const AdvancedBettingStats: React.FC<AdvancedBettingStatsProps> = ({
  round1Bets,
  round2Bets,
  currentRound,
  isGameActive
}) => {
  // Calculate totals
  const round1Total = round1Bets.andar + round1Bets.bahar;
  const round2Total = round2Bets.andar + round2Bets.bahar;
  const totalAndar = round1Bets.andar + round2Bets.andar;
  const totalBahar = round1Bets.bahar + round2Bets.bahar;
  const grandTotal = totalAndar + totalBahar;

  // Calculate lowest bet and variation
  const lowestBetSide = totalAndar <= totalBahar ? 'andar' : 'bahar';
  const lowestBetAmount = Math.min(totalAndar, totalBahar);
  const highestBetAmount = Math.max(totalAndar, totalBahar);
  const variationAmount = highestBetAmount - lowestBetAmount;
  const variationPercentage = grandTotal > 0 ? (variationAmount / grandTotal) * 100 : 0;

  // Simulate live betting updates during active game
  const [liveBetting, setLiveBetting] = useState({
    round1Andar: round1Bets.andar,
    round1Bahar: round1Bets.bahar,
    round2Andar: round2Bets.andar,
    round2Bahar: round2Bets.bahar,
  });

  // Simulate betting activity
  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      setLiveBetting(prev => {
        const newAndar = prev.round1Andar + Math.floor(Math.random() * 1000) + 100;
        const newBahar = prev.round1Bahar + Math.floor(Math.random() * 1000) + 100;
        
        if (currentRound >= 2) {
          return {
            round1Andar: newAndar,
            round1Bahar: newBahar,
            round2Andar: prev.round2Andar + Math.floor(Math.random() * 800) + 50,
            round2Bahar: prev.round2Bahar + Math.floor(Math.random() * 800) + 50,
          };
        }
        
        return {
          round1Andar: newAndar,
          round1Bahar: newBahar,
          round2Andar: prev.round2Andar,
          round2Bahar: prev.round2Bahar,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isGameActive, currentRound]);

  const currentLiveBetting = isGameActive ? liveBetting : {
    round1Andar: round1Bets.andar,
    round1Bahar: round1Bets.bahar,
    round2Andar: round2Bets.andar,
    round2Bahar: round2Bets.bahar,
  };

  const liveTotalAndar = currentLiveBetting.round1Andar + currentLiveBetting.round2Andar;
  const liveTotalBahar = currentLiveBetting.round1Bahar + currentLiveBetting.round2Bahar;
  const liveGrandTotal = liveTotalAndar + liveTotalBahar;

  return (
    <div className="advanced-betting-stats">
      <div className="stats-header">
        <h2>
          <DollarSign className="header-icon" />
          Advanced Betting Statistics
        </h2>
        {isGameActive && (
          <div className="live-indicator">
            <div className="live-dot"></div>
            <span>LIVE BETTING</span>
          </div>
        )}
      </div>

      <div className="stats-grid">
        {/* Andar Betting Card */}
        <div className="betting-card andar-card">
          <div className="card-header">
            <div className="side-indicator andar"></div>
            <h3>Andar Betting</h3>
            {isGameActive && <div className="live-badge">LIVE</div>}
          </div>
          
          <div className="round-breakdown">
            <div className="round-item">
              <span className="round-label">1st Round</span>
              <span className="round-amount">₹{currentLiveBetting.round1Andar.toLocaleString('en-IN')}</span>
            </div>
            {currentRound >= 2 && (
              <div className="round-item">
                <span className="round-label">2nd Round</span>
                <span className="round-amount">₹{currentLiveBetting.round2Andar.toLocaleString('en-IN')}</span>
              </div>
            )}
            {currentRound >= 3 && (
              <div className="round-item">
                <span className="round-label">3rd Round</span>
                <span className="round-amount">₹0</span>
              </div>
            )}
          </div>
          
          <div className="total-section">
            <div className="total-label">Total Andar</div>
            <div className="total-amount">₹{liveTotalAndar.toLocaleString('en-IN')}</div>
          </div>
          
          {isGameActive && (
            <div className="betting-activity">
              <div className="activity-bar">
                <div 
                  className="activity-fill andar-fill" 
                  style={{ width: `${liveGrandTotal > 0 ? (liveTotalAndar / liveGrandTotal) * 100 : 50}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Bahar Betting Card */}
        <div className="betting-card bahar-card">
          <div className="card-header">
            <div className="side-indicator bahar"></div>
            <h3>Bahar Betting</h3>
            {isGameActive && <div className="live-badge">LIVE</div>}
          </div>
          
          <div className="round-breakdown">
            <div className="round-item">
              <span className="round-label">1st Round</span>
              <span className="round-amount">₹{currentLiveBetting.round1Bahar.toLocaleString('en-IN')}</span>
            </div>
            {currentRound >= 2 && (
              <div className="round-item">
                <span className="round-label">2nd Round</span>
                <span className="round-amount">₹{currentLiveBetting.round2Bahar.toLocaleString('en-IN')}</span>
              </div>
            )}
            {currentRound >= 3 && (
              <div className="round-item">
                <span className="round-label">3rd Round</span>
                <span className="round-amount">₹0</span>
              </div>
            )}
          </div>
          
          <div className="total-section">
            <div className="total-label">Total Bahar</div>
            <div className="total-amount">₹{liveTotalBahar.toLocaleString('en-IN')}</div>
          </div>
          
          {isGameActive && (
            <div className="betting-activity">
              <div className="activity-bar">
                <div 
                  className="activity-fill bahar-fill" 
                  style={{ width: `${liveGrandTotal > 0 ? (liveTotalBahar / liveGrandTotal) * 100 : 50}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Lowest Bet Card */}
        <div className="betting-card lowest-bet-card">
          <div className="card-header">
            <Calculator className="header-icon" />
            <h3>Lowest Bet Analysis</h3>
          </div>
          
          <div className="lowest-bet-content">
            <div className="lowest-side">
              <span className="side-label">Lowest Side:</span>
              <div className={`side-display ${lowestBetSide}`}>
                {lowestBetSide === 'andar' ? 'ANDAR' : 'BAHAR'}
              </div>
            </div>
            
            <div className="lowest-amount">
              <span className="amount-label">Lowest Amount:</span>
              <span className="amount-value">₹{lowestBetAmount.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="variation-info">
              <div className="variation-header">
                <span className="variation-label">Variation Amount:</span>
                <div className={`variation-indicator ${variationPercentage > 20 ? 'high' : variationPercentage > 10 ? 'medium' : 'low'}`}>
                  {variationPercentage > 20 ? <TrendingUp /> : variationPercentage > 10 ? <Minus /> : <TrendingDown />}
                  <span>₹{variationAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <div className="variation-percentage">
                <span className="percentage-label">Variation:</span>
                <span className={`percentage-value ${variationPercentage > 20 ? 'high' : variationPercentage > 10 ? 'medium' : 'low'}`}>
                  {variationPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="variation-visual">
            <div className="comparison-bar">
              <div 
                className="andar-bar" 
                style={{ width: `${liveGrandTotal > 0 ? (liveTotalAndar / liveGrandTotal) * 100 : 50}%` }}
              >
                <span className="bar-label">A</span>
              </div>
              <div 
                className="bahar-bar" 
                style={{ width: `${liveGrandTotal > 0 ? (liveTotalBahar / liveGrandTotal) * 100 : 50}%` }}
              >
                <span className="bar-label">B</span>
              </div>
            </div>
            <div className="balance-indicator">
              {variationPercentage < 5 ? (
                <span className="balanced">✓ Balanced</span>
              ) : variationPercentage < 15 ? (
                <span className="moderate">⚠ Moderate</span>
              ) : (
                <span className="imbalanced">⚠ Imbalanced</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Overview Card */}
        <div className="betting-card total-overview-card">
          <div className="card-header">
            <Eye className="header-icon" />
            <h3>Total Overview</h3>
          </div>
          
          <div className="overview-content">
            <div className="grand-total">
              <span className="grand-label">Grand Total</span>
              <span className="grand-amount">₹{liveGrandTotal.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="distribution">
              <div className="distribution-item">
                <span className="dist-label">Andar Share</span>
                <span className="dist-value">
                  {liveGrandTotal > 0 ? ((liveTotalAndar / liveGrandTotal) * 100).toFixed(1) : '50.0'}%
                </span>
              </div>
              <div className="distribution-item">
                <span className="dist-label">Bahar Share</span>
                <span className="dist-value">
                  {liveGrandTotal > 0 ? ((liveTotalBahar / liveGrandTotal) * 100).toFixed(1) : '50.0'}%
                </span>
              </div>
            </div>
            
            <div className="betting-status">
              {isGameActive ? (
                <div className="status-active">
                  <div className="status-dot active"></div>
                  <span>Betting Active</span>
                </div>
              ) : (
                <div className="status-paused">
                  <div className="status-dot paused"></div>
                  <span>Betting Paused</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedBettingStats;
