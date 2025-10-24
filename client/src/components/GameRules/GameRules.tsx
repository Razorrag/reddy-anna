import React from 'react';
import { getSectionClass, getCardClass } from '../../lib/theme-utils';

const GameRules: React.FC = () => {
  return (
    <section id="gamerules" className={getSectionClass()}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gold mb-8 sm:mb-12">Andar Bahar Rules</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12">
          <div className={getCardClass()}>
            <h3 className="text-xl sm:text-2xl font-bold text-gold mb-4 sm:mb-6">How to Play</h3>
            <ul className="space-y-3 sm:space-y-4 text-gray-300">
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">1. The game starts with one "Opening Card" dealt face up in the middle</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">2. Players place bets on either "Andar" or "Bahar" before the timer runs out</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">3. Cards are dealt alternately to "Andar" and "Bahar" sides</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">4. The game ends when a card matching the value of the Opening Card appears</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">5. If the matching card appears on the Andar side, Andar wins; vice versa for Bahar</span>
              </li>
            </ul>
          </div>
          
          <div className={getCardClass()}>
            <h3 className="text-xl sm:text-2xl font-bold text-gold mb-4 sm:mb-6">Winning Conditions</h3>
            <ul className="space-y-3 sm:space-y-4 text-gray-300">
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">Winning side gets 1:1 payout minus 5% commission</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">If the 5th card on either side matches the opening card, payout is 1:1</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">If the opening card appears on the 4th position or earlier, payout is 1:1</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2 sm:mr-3 text-lg">•</span>
                <span className="text-sm sm:text-base">Special payout for 5th card: 4:1 (before commission)</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className={getCardClass()}>
          <h3 className="text-xl sm:text-2xl font-bold text-gold mb-4 sm:mb-6 text-center">Betting Phases</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-4 sm:p-6 bg-black/40 border border-gold/20 rounded-lg hover:border-gold/40 transition-all">
              <div className="text-2xl sm:text-3xl text-gold mb-2 sm:mb-3 font-bold">Round 1</div>
              <p className="text-gray-300 text-sm sm:text-base">Initial betting phase with 60 seconds timer</p>
            </div>
            <div className="text-center p-4 sm:p-6 bg-black/40 border border-gold/20 rounded-lg hover:border-gold/40 transition-all">
              <div className="text-2xl sm:text-3xl text-gold mb-2 sm:mb-3 font-bold">Round 2</div>
              <p className="text-gray-300 text-sm sm:text-base">Second betting phase with 30 seconds timer</p>
            </div>
            <div className="text-center p-4 sm:p-6 bg-black/40 border border-gold/20 rounded-lg hover:border-gold/40 transition-all">
              <div className="text-2xl sm:text-3xl text-gold mb-2 sm:mb-3 font-bold">Final Draw</div>
              <p className="text-gray-300 text-sm sm:text-base">Continuous card dealing until winner is found</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameRules;
