import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const LanguageSelector: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setSelectedLanguage(savedLanguage);
  }, []);

  // Update localStorage when language changes
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    localStorage.setItem('language', lang);
    
    // In a real implementation, you would update the UI language here
    // For now, we'll just store the preference
  };

  return (
    <div className="relative">
      <select
        value={selectedLanguage}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="bg-transparent text-white border border-gold rounded-full py-1.5 px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer"
      >
        <option value="en" className="bg-gray-800">English</option>
        <option value="hi" className="bg-gray-800">हिंदी</option>
        <option value="te" className="bg-gray-800">తెలుగు</option>
      </select>
      {/* Custom dropdown arrow */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;
