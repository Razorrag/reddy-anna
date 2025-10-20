import React from 'react';
import { getSectionClass, getCardClass } from '../../lib/theme-utils';

const GameRules: React.FC = () => {
  return (
    <section id="gamerules" className={getSectionClass()}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gold mb-12">Andar Bahar Rules</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className={getCardClass()}>
            <h3 className="text-2xl font-bold text-gold mb-6">How to Play</h3>
            <ul className="space-y-4 text-gray-200">
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>1. The game starts with one "Opening Card" dealt face up in the middle</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>2. Players place bets on either "Andar" or "Bahar" before the timer runs out</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>3. Cards are dealt alternately to "Andar" and "Bahar" sides</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>4. The game ends when a card matching the value of the Opening Card appears</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>5. If the matching card appears on the Andar side, Andar wins; vice versa for Bahar</span>
              </li>
            </ul>
          </div>
          
          <div className={getCardClass()}>
            <h3 className="text-2xl font-bold text-gold mb-6">Winning Conditions</h3>
            <ul className="space-y-4 text-gray-200">
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>Winning side gets 1:1 payout minus 5% commission</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>If the 5th card on either side matches the opening card, payout is 1:1</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>If the opening card appears on the 4th position or earlier, payout is 1:1</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>Special payout for 5th card: 4:1 (before commission)</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className={getCardClass()}>
          <h3 className="text-2xl font-bold text-gold mb-6">Betting Phases</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-700/50 rounded-lg">
              <div className="text-3xl text-gold mb-3">Round 1</div>
              <p className="text-gray-200">Initial betting phase with 60 seconds timer</p>
            </div>
            <div className="text-center p-6 bg-gray-700/50 rounded-lg">
              <div className="text-3xl text-gold mb-3">Round 2</div>
              <p className="text-gray-200">Second betting phase with 30 seconds timer</p>
            </div>
            <div className="text-center p-6 bg-gray-700/50 rounded-lg">
              <div className="text-3xl text-gold mb-3">Final Draw</div>
              <p className="text-gray-200">Continuous card dealing until winner is found</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameRules;
