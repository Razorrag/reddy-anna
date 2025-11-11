import React, { useState } from 'react';
import { getSectionClass, getCardClass, getButtonClass, getInputClass } from '../../lib/theme-utils';
import { cn } from '../../lib/utils';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitMessage('Thank you for your message! We will contact you soon.');
      setFormData({ name: '', email: '', mobile: '', message: '' });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitMessage(''), 5000);
    }, 1000);
  };

  return (
    <section id="contact" className={getSectionClass()}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gold mb-8 sm:mb-12">Contact Us</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* Contact Form */}
          <div className={getCardClass()}>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Send us a Message</h3>
            
            {submitMessage && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-900/50 border border-green-500/30 text-green-200 rounded-lg text-sm sm:text-base">
                {submitMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4 sm:mb-6">
                <label htmlFor="name" className="block text-gray-300 mb-2 text-sm sm:text-base">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={getInputClass()}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div>
                  <label htmlFor="email" className="block text-gray-300 mb-2 text-sm sm:text-base">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={getInputClass()}
                    placeholder="Enter your email"
                  />
                </div>
                
                <div>
                  <label htmlFor="mobile" className="block text-gray-300 mb-2 text-sm sm:text-base">Mobile Number</label>
                  <input
                    type="tel"
                    id="mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    required
                    className={getInputClass()}
                    placeholder="Enter your mobile number"
                  />
                </div>
              </div>
              
              <div className="mb-4 sm:mb-6">
                <label htmlFor="message" className="block text-gray-300 mb-2 text-sm sm:text-base">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className={getInputClass()}
                  placeholder="Enter your message"
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(getButtonClass('primary'), 'w-full disabled:opacity-50')}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
          
          {/* Additional Info */}
          <div>
            <div className={cn(getCardClass(), 'mb-6 sm:mb-8')}>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Get in Touch</h3>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                We're here to help! Fill out the form and our team will get back to you as soon as possible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
