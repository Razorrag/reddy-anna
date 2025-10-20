import React from 'react';

const ThemeGuide: React.FC = () => {
  return (
    <div className="p-8 bg-gradient-to-b from-gray-900 to-black min-h-screen">
      <h1 className="text-4xl font-bold text-center text-gold mb-12">Theme Guidelines</h1>
      
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Color Palette */}
        <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="w-full h-16 bg-gold rounded mb-2"></div>
              <div className="text-white">Gold (#FFD700)</div>
            </div>
            <div>
              <div className="w-full h-16 bg-green-500 rounded mb-2"></div>
              <div className="text-white">Green (#28a745)</div>
            </div>
            <div>
              <div className="w-full h-16 bg-red-500 rounded mb-2"></div>
              <div className="text-white">Red (#dc3545)</div>
            </div>
            <div>
              <div className="w-full h-16 bg-blue-500 rounded mb-2"></div>
              <div className="text-white">Blue (#007bff)</div>
            </div>
          </div>
        </div>
        
        {/* Typography */}
        <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Typography</h2>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gold">Heading 1 (text-4xl, font-bold, text-gold)</h1>
            <h2 className="text-3xl font-bold text-white">Heading 2 (text-3xl, font-bold, text-white)</h2>
            <h3 className="text-2xl font-bold text-white">Heading 3 (text-2xl, font-bold, text-white)</h3>
            <p className="text-lg text-gray-200">Paragraph (text-lg, text-gray-200)</p>
            <p className="text-base text-gray-300">Body (text-base, text-gray-300)</p>
            <p className="text-sm text-gray-400">Caption (text-sm, text-gray-400)</p>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-gold text-black rounded-full font-semibold hover:bg-yellow-400 transition-colors duration-200">
              Primary (Gold)
            </button>
            <button className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors duration-200">
              Secondary (White)
            </button>
            <button className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition-colors duration-200">
              Success
            </button>
            <button className="px-6 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors duration-200">
              Danger
            </button>
          </div>
        </div>
        
        {/* Cards */}
        <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Default Card</h3>
              <p className="text-gray-300">bg-gray-800/50 with backdrop-blur-sm and border-gray-700</p>
            </div>
            <div className="bg-black/50 p-6 rounded-xl backdrop-blur-sm border border-[rgba(40,167,69,0.5)]">
              <h3 className="text-xl font-bold text-white mb-4">Success Card</h3>
              <p className="text-gray-300">With success border color</p>
            </div>
          </div>
        </div>
        
        {/* Shadows and Effects */}
        <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Shadows and Effects</h2>
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
              <p>Basic shadow effect</p>
            </div>
            <div className="p-4 bg-white rounded-md border-3 border-gold shadow-[0_8px_32px_rgba(255,215,0,0.5)_inset_0_2px_8px_rgba(255,255,255,0.3)]">
              <p>Gold border with inset shadow</p>
            </div>
            <div className="p-4 bg-white rounded-md animate-pulse-win border-gold shadow-[0_0_20px_rgba(255,215,0,0.9)]">
              <p>Win animation with glow</p>
            </div>
          </div>
        </div>

        {/* Gradients */}
        <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Background Gradients</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-24 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Default</span>
            </div>
            <div className="h-24 bg-andar-gradient rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Andar</span>
            </div>
            <div className="h-24 bg-bahar-gradient rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Bahar</span>
            </div>
            <div className="h-24 bg-admin-gradient rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">Admin</span>
            </div>
          </div>
        </div>

        {/* Spacing Guidelines */}
        <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Spacing Guidelines</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex items-center gap-4">
              <div className="w-20 bg-gold h-4"></div>
              <span>Sections: py-20 (80px vertical padding)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 bg-gold h-4"></div>
              <span>Containers: max-w-6xl mx-auto px-4 sm:px-6 lg:px-8</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 bg-gold h-4"></div>
              <span>Cards: p-6 (24px padding)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 bg-gold h-4"></div>
              <span>Buttons: px-6 py-3 (24px horizontal, 12px vertical)</span>
            </div>
          </div>
        </div>

        {/* Animation Guidelines */}
        <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Animation Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gold mb-2">Standard Animations</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• transition-all duration-200 (buttons, links)</li>
                <li>• transition-all duration-300 (navigation, modals)</li>
                <li>• hover:-translate-y-1.25 (cards)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gold mb-2">Special Animations</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• animate-pulse-gold (live indicators)</li>
                <li>• animate-pulse-win (winning effects)</li>
                <li>• animate-slide-in-up (modals, notifications)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeGuide;
