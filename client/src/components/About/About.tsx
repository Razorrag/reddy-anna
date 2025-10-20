import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-gradient-to-br from-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gold mb-12">About Reddy Anna</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h3 className="text-3xl font-bold text-white mb-6">India's Premier Andar Bahar Platform</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Welcome to Reddy Anna, the most trusted and exciting Andar Bahar gaming platform in India. 
              We bring you the authentic casino experience with cutting-edge technology, ensuring fair play, 
              security, and endless entertainment.
            </p>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Founded with a vision to revolutionize online gaming in India, Reddy Anna combines traditional 
              Andar Bahar gameplay with modern digital innovation. Our platform is designed for both beginners 
              and experienced players, offering a seamless and immersive gaming experience.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <div className="text-3xl font-bold text-gold mb-2">100K+</div>
                <div className="text-gray-300">Active Players</div>
              </div>
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <div className="text-3xl font-bold text-gold mb-2">24/7</div>
                <div className="text-gray-300">Live Games</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm border border-gray-700">
            <h4 className="text-2xl font-bold text-gold mb-6">Why Choose Reddy Anna?</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-white font-semibold mb-1">Licensed & Regulated</h5>
                  <p className="text-gray-300 text-sm">Fully licensed gaming platform with strict compliance to Indian regulations</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-white font-semibold mb-1">Secure Transactions</h5>
                  <p className="text-gray-300 text-sm">Bank-level encryption and multiple payment options for your safety</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-white font-semibold mb-1">24/7 Customer Support</h5>
                  <p className="text-gray-300 text-sm">Dedicated support team available round the clock to assist you</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-white font-semibold mb-1">Fair Play Guaranteed</h5>
                  <p className="text-gray-300 text-sm">Certified random number generators ensure completely fair gameplay</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Live Statistics</h4>
            <p className="text-gray-300">Real-time game statistics and betting trends to help you make informed decisions</p>
          </div>
          
          <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Easy to Use</h4>
            <p className="text-gray-300">Intuitive interface designed for players of all skill levels</p>
          </div>
          
          <div className="bg-gray-800/50 p-6 rounded-xl backdrop-blur-sm border border-gray-700 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Secure & Private</h4>
            <p className="text-gray-300">Your data and transactions are protected with advanced security measures</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
