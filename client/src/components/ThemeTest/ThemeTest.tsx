import React, { FC } from 'react';
import { getButtonClass, getCardClass, getInputClass, themeColors } from '../ThemeUtils/ThemeUtils';
import { cn } from '../../lib/utils';

const ThemeTest: FC = () => {
  const [testInput, setTestInput] = React.useState('');
  const [testError, setTestError] = React.useState(false);

  return (
    <div className={cn(themeColors.background, "min-h-screen p-8")}>
      <h1 className="text-4xl font-bold text-center text-gold mb-12">Theme Test Page</h1>
      
      <div className="max-w-6xl mx-auto space-y-8">
        <div className={getCardClass()}>
          <h2 className="text-2xl font-bold text-white mb-4">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <button className={getButtonClass('primary')}>Primary</button>
            <button className={getButtonClass('secondary')}>Secondary</button>
            <button className={getButtonClass('success')}>Success</button>
            <button className={getButtonClass('danger')}>Danger</button>
            <button className={getButtonClass('warning')}>Warning</button>
            <button className={getButtonClass('info')}>Info</button>
          </div>
        </div>
        
        <div className={getCardClass()}>
          <h2 className="text-2xl font-bold text-white mb-4">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={getCardClass('default')}>
              <h3 className="text-xl font-bold text-white">Default</h3>
              <p className="text-gray-300">Default card styling</p>
            </div>
            <div className={getCardClass('success')}>
              <h3 className="text-xl font-bold text-white">Success</h3>
              <p className="text-gray-300">Success card styling</p>
            </div>
            <div className={getCardClass('danger')}>
              <h3 className="text-xl font-bold text-white">Danger</h3>
              <p className="text-gray-300">Danger card styling</p>
            </div>
          </div>
        </div>
        
        <div className={getCardClass()}>
          <h2 className="text-2xl font-bold text-white mb-4">Inputs</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Normal input"
              className={getInputClass()}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
            />
            <input
              type="text"
              placeholder="Error input"
              className={getInputClass(true)}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
            />
            <button 
              className={getButtonClass('warning')}
              onClick={() => setTestError(!testError)}
            >
              Toggle Error State
            </button>
          </div>
        </div>
        
        <div className={getCardClass()}>
          <h2 className="text-2xl font-bold text-white mb-4">Typography</h2>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gold">H1 Title</h1>
            <h2 className="text-3xl font-bold text-white">H2 Title</h2>
            <h3 className="text-2xl font-bold text-white">H3 Title</h3>
            <p className="text-lg text-gray-200">Large paragraph text</p>
            <p className="text-base text-gray-300">Regular paragraph text</p>
            <p className="text-sm text-gray-400">Small paragraph text</p>
          </div>
        </div>

        <div className={getCardClass()}>
          <h2 className="text-2xl font-bold text-white mb-4">Interactive Elements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 hover:-translate-y-1.25 hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)] transition-all duration-300">
              <h3 className="text-xl font-bold text-white mb-2">Hover Card</h3>
              <p className="text-gray-300">This card has hover effects</p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gold shadow-[0_8px_32px_rgba(255,215,0,0.5)_inset_0_2px_8px_rgba(255,255,255,0.3)]">
              <h3 className="text-xl font-bold text-white mb-2">Gold Border Card</h3>
              <p className="text-gray-300">This card has gold border styling</p>
            </div>
          </div>
        </div>

        <div className={getCardClass()}>
          <h2 className="text-2xl font-bold text-white mb-4">Animation Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 animate-pulse-gold">
              <h3 className="text-xl font-bold text-white">Pulse Gold</h3>
              <p className="text-gray-300">Gold pulse animation</p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 animate-pulse-win">
              <h3 className="text-xl font-bold text-white">Pulse Win</h3>
              <p className="text-gray-300">Win pulse animation</p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 animate-slide-in-up">
              <h3 className="text-xl font-bold text-white">Slide In</h3>
              <p className="text-gray-300">Slide in animation</p>
            </div>
          </div>
        </div>

        <div className={getCardClass()}>
          <h2 className="text-2xl font-bold text-white mb-4">Gradient Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-32 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Default</span>
            </div>
            <div className="h-32 bg-andar-gradient rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Andar</span>
            </div>
            <div className="h-32 bg-bahar-gradient rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Bahar</span>
            </div>
            <div className="h-32 bg-admin-gradient rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Admin</span>
            </div>
          </div>
        </div>

        <div className={getCardClass()}>
          <h2 className="text-2xl font-bold text-white mb-4">Responsive Test</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg text-center">
              <div className="text-gold font-bold">Mobile</div>
              <div className="text-gray-300 text-sm">1 column</div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg text-center">
              <div className="text-gold font-bold">Small</div>
              <div className="text-gray-300 text-sm">2 columns</div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg text-center">
              <div className="text-gold font-bold">Medium</div>
              <div className="text-gray-300 text-sm">2 columns</div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg text-center">
              <div className="text-gold font-bold">Large</div>
              <div className="text-gray-300 text-sm">4 columns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeTest;
