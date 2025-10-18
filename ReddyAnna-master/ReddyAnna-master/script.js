// Reddy Anna Kossu Website JavaScript
function showcoins(){
    document.querySelector('.game-controls').style.display='none';
    document.querySelector('.chip-selection').style.display='flex';
    
}
function updateshowcoins(event) {
    // Get the button that was clicked
    const button = event.currentTarget;
    
    // Find the image inside it
    const img = button.querySelector('img');
    
    // Get the image src
    const imgSrc = img.getAttribute('src');
    


    
    // Example: show it somewhere on screen
    const selectCoinImg = document.querySelector('.select-coins');
    if (selectCoinImg) {
        selectCoinImg.src = imgSrc;
    }
    revertshowcoins();
}
function revertshowcoins(){
    document.querySelector('.chip-selection').style.display='none';
    document.querySelector('.game-controls').style.display='flex';
}

class ReddyAnnaKossu {
    constructor() {
        this.currentLanguage = 'en';
        this.imageSliderInterval = null;
        this.currentSlide = 0;
        this.slides = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeVideoBackground();
        this.initializeImageSlider();
        this.initializeLanguageSupport();
        this.initializeSmoothScrolling();
        this.initializeAnimations();
        this.initializeContactForm();
        this.initializeAdminPanel();
        this.initializeAuthUI();
    }

    setupEventListeners() {
        // Mobile menu toggle
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
        }

        // Language selector
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }

        // Hero buttons
        const heroButtons = document.querySelectorAll('.hero-buttons .btn');
        heroButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const text = button.textContent.trim();
                if (text.includes('Start Playing') || text.includes('खेलना शुरू करें') || text.includes('ఆడటం ప్రారంభించండి')) {
                    window.location.href = 'game.html';
                } else if (text.includes('Learn More') || text.includes('और जानें') || text.includes('మరింత తెలుసుకోండి')) {
                    this.scrollToSection('about');
                }
            });
        });

        // Game showcase buttons
        const playButtons = document.querySelectorAll('.play-btn');
        playButtons.forEach(button => {
            button.addEventListener('click', () => {
                window.location.href = 'game.html';
            });
        });

        // Learn Rules button
        const learnRulesBtn = document.querySelector('.game-actions .btn-secondary');
        if (learnRulesBtn) {
            learnRulesBtn.addEventListener('click', () => {
                this.scrollToSection('game-rules');
            });
        }

        // Scroll indicator
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', () => {
                this.scrollToSection('games');
            });
        }

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            this.handleNavbarScroll();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }

    initializeVideoBackground() {
        const heroVideo = document.getElementById('heroVideo');
        const imageSlider = document.getElementById('imageSlider');
        
        if (heroVideo) {
            // Check if video can play
            heroVideo.addEventListener('error', () => {
                console.log('Video failed to load, switching to image slider');
                this.switchToImageSlider();
            });

            heroVideo.addEventListener('loadeddata', () => {
                console.log('Video loaded successfully');
            });

            // Fallback to image slider if video doesn't load within 3 seconds
            setTimeout(() => {
                if (heroVideo.readyState < 2) {
                    this.switchToImageSlider();
                }
            }, 3000);
        } else {
            this.switchToImageSlider();
        }
    }

    switchToImageSlider() {
        const heroVideo = document.getElementById('heroVideo');
        const imageSlider = document.getElementById('imageSlider');
        
        if (heroVideo) {
            heroVideo.style.display = 'none';
        }
        
        if (imageSlider) {
            imageSlider.style.display = 'block';
            this.startImageSlider();
        }
    }

    initializeImageSlider() {
        this.slides = document.querySelectorAll('.image-slider .slide');
        if (this.slides.length > 0) {
            this.startImageSlider();
        }
    }

    startImageSlider() {
        if (this.imageSliderInterval) {
            clearInterval(this.imageSliderInterval);
        }

        this.imageSliderInterval = setInterval(() => {
            this.nextSlide();
        }, 5000);
    }

    nextSlide() {
        if (this.slides.length === 0) return;

        this.slides[this.currentSlide].classList.remove('active');
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;
        this.slides[this.currentSlide].classList.add('active');
    }

    initializeLanguageSupport() {
        // Load saved language preference
        const savedLanguage = localStorage.getItem('reddy-anna-language');
        if (savedLanguage) {
            this.currentLanguage = savedLanguage;
            const languageSelect = document.getElementById('languageSelect');
            if (languageSelect) {
                languageSelect.value = savedLanguage;
            }
        }
        
        this.updateLanguageContent();
    }

    changeLanguage(language) {
        this.currentLanguage = language;
        localStorage.setItem('reddy-anna-language', language);
        this.updateLanguageContent();
        
        // Show notification
        this.showNotification(this.getTranslation('languageChanged', language), 'success');
    }

    updateLanguageContent() {
        const elements = document.querySelectorAll('[data-en]');
        
        elements.forEach(element => {
            const text = element.getAttribute(`data-${this.currentLanguage}`);
            if (text) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = text;
                } else {
                    element.textContent = text;
                }
            }
        });

        // Update page title
        const titles = {
            'en': 'Reddy Anna Kossu - Premium Gaming Experience',
            'hi': 'रेड्डी अन्ना कोस्सु - प्रीमियम गेमिंग अनुभव',
            'te': 'రెడ్డి అన్నా కొస్సు - ప్రీమియం గేమింగ్ అనుభవం'
        };
        
        document.title = titles[this.currentLanguage] || titles['en'];
    }

    getTranslation(key, language = this.currentLanguage) {
        const translations = {
            'languageChanged': {
                'en': 'Language changed successfully!',
                'hi': 'भाषा सफलतापूर्वक बदली गई!',
                'te': 'భాష విజయవంతంగా మార్చబడింది!'
            },
            'formSubmitted': {
                'en': 'Message sent successfully!',
                'hi': 'संदेश सफलतापूर्वक भेजा गया!',
                'te': 'సందేశం విజయవంతంగా పంపబడింది!'
            },
            'formError': {
                'en': 'Please fill in all fields correctly.',
                'hi': 'कृपया सभी फ़ील्ड सही तरीके से भरें।',
                'te': 'దయచేసి అన్ని ఫీల్డ్లను సరిగ్గా పూరించండి.'
            }
        };
        
        return translations[key]?.[language] || translations[key]?.['en'] || key;
    }

    initializeSmoothScrolling() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Check if it's an external link or page link
                if (href.startsWith('http') || href.includes('.html')) {
                    // Let the browser handle external links and page links normally
                    return;
                }
                
                // Handle anchor links for smooth scrolling
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    this.scrollToSection(targetId);
                }
            });
        });
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = section.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }

    initializeAnimations() {
        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        const animateElements = document.querySelectorAll('.game-card, .feature, .contact-item');
        animateElements.forEach(el => {
            observer.observe(el);
        });
    }

    initializeContactForm() {
        const contactForm = document.getElementById('contactForm');
        
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactFormSubmit(contactForm);
            });
        }
    }

    handleContactFormSubmit(form) {
        const formData = new FormData(form);
        const name = formData.get('name');
        const email = formData.get('email');
        const message = formData.get('message');

        // Basic validation
        if (!name || !email || !message) {
            this.showNotification(this.getTranslation('formError'), 'error');
            return;
        }

        // Simulate form submission
        this.showNotification(this.getTranslation('formSubmitted'), 'success');
        form.reset();

        // In a real application, you would send the data to a server
        console.log('Form submitted:', { name, email, message });
    }

    handlePlayButtonClick(button) {
        // Add click animation
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);

        // Show game modal or redirect (placeholder)
        this.showNotification('Opening Andar Bahar...', 'info');
        
        // In a real application, you would open the game or redirect to game page
        setTimeout(() => {
            this.showNotification('Andar Bahar is coming soon!', 'info');
        }, 1000);
    }

    handleNavbarScroll() {
        const header = document.querySelector('.header');
        const scrollY = window.scrollY;

        if (scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    handleWindowResize() {
        // Handle responsive adjustments
        if (window.innerWidth <= 768) {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) {
                navMenu.classList.remove('active');
            }
        }
    }

    initializeAdminPanel() {
        // Create admin panel for editing WhatsApp number
        this.createAdminPanel();
    }

    initializeAuthUI() {
        // Reflect logged-in user in nav
        const user = this.getLoggedInUser();
        this.updateNavForAuth(user);
    }

    getLoggedInUser() {
        try {
            const raw = localStorage.getItem('rk_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    updateNavForAuth(user) {
        const navList = document.querySelector('.nav-list');
        if (!navList) return;

        // Hide Login/SignUp links if logged in
        const loginLink = navList.querySelector('a[href="login.html"]')?.closest('li');
        const signupLink = navList.querySelector('a[href="signup.html"]')?.closest('li');

        const existingUserLi = navList.querySelector('.nav-user');
        if (existingUserLi) existingUserLi.remove();

        if (user && user.name) {
            if (loginLink) loginLink.style.display = 'none';
            if (signupLink) signupLink.style.display = 'none';

            const li = document.createElement('li');
            li.className = 'nav-user';
            const profileLink = document.createElement('a');
            profileLink.href = '#';
            profileLink.className = 'nav-link profile-link';
            profileLink.textContent = 'View Profile';
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProfileModal(user);
            });
            li.appendChild(profileLink);
            navList.appendChild(li);
        } else {
            if (loginLink) loginLink.style.display = '';
            if (signupLink) signupLink.style.display = '';
        }
    }

    showProfileModal(user) {
        // Remove existing modal if any
        const existingModal = document.getElementById('profileModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'profileModal';
        modal.className = 'profile-modal-overlay';
        modal.innerHTML = `
            <div class="profile-modal">
                <div class="profile-modal-header">
                    <h3>User Profile</h3>
                    <button class="close-modal" onclick="reddyAnnaKossu.closeProfileModal()">&times;</button>
                </div>
                <div class="profile-modal-body">
                    <div class="profile-field">
                        <label>Name:</label>
                        <span>${user.name || 'N/A'}</span>
                    </div>
                    <div class="profile-field">
                        <label>Mobile:</label>
                        <span>${user.mobile || 'N/A'}</span>
                    </div>
                    <div class="profile-field">
                        <label>Email:</label>
                        <span>${user.email || 'Not provided'}</span>
                    </div>
                </div>
                <div class="profile-modal-footer">
                    <button class="logout-btn" onclick="reddyAnnaKossu.logout()">Logout</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) modal.remove();
    }

    logout() {
        localStorage.removeItem('rk_user');
        this.closeProfileModal();
        this.updateNavForAuth(null);
        this.showNotification('Logged out successfully', 'success');
    }

    createAdminPanel() {
        // Check if user is admin (in real app, this would be proper authentication)
        const isAdmin = localStorage.getItem('reddy-anna-admin') === 'true';
        
        if (isAdmin) {
            this.showAdminPanel();
        }

        // Add admin access (for demo purposes - Ctrl+Shift+A)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.toggleAdminPanel();
            }
        });
    }

    toggleAdminPanel() {
        const isAdmin = localStorage.getItem('reddy-anna-admin') === 'true';
        localStorage.setItem('reddy-anna-admin', (!isAdmin).toString());
        
        if (!isAdmin) {
            this.showAdminPanel();
        } else {
            this.hideAdminPanel();
        }
    }

    showAdminPanel() {
        const existingPanel = document.getElementById('adminPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const adminPanel = document.createElement('div');
        adminPanel.id = 'adminPanel';
        adminPanel.innerHTML = `
            <div class="admin-panel">
                <h3>Admin Panel</h3>
                <div class="admin-section">
                    <label>WhatsApp Number:</label>
                    <input type="text" id="adminWhatsApp" value="+91 8686886632">
                    <button onclick="reddyAnnaKossu.updateWhatsAppNumber()">Update</button>
                </div>
                <div class="admin-section">
                    <label>Language Content:</label>
                    <select id="adminLanguage">
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="te">Telugu</option>
                    </select>
                    <button onclick="reddyAnnaKossu.editLanguageContent()">Edit Content</button>
                </div>
                <button onclick="reddyAnnaKossu.hideAdminPanel()" class="close-admin">Close</button>
            </div>
        `;

        document.body.appendChild(adminPanel);
    }

    hideAdminPanel() {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.remove();
        }
    }

    updateWhatsAppNumber() {
        const newNumber = document.getElementById('adminWhatsApp').value;
        const whatsappElements = document.querySelectorAll('#whatsappNumber, .footer-section p');
        
        whatsappElements.forEach(element => {
            if (element.textContent.includes('+91 8686886632')) {
                element.textContent = element.textContent.replace('+91 8686886632', newNumber);
            }
        });

        // Update WhatsApp float button
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        if (whatsappBtn) {
            whatsappBtn.href = `https://wa.me/${newNumber.replace(/\D/g, '')}`;
        }

        this.showNotification('WhatsApp number updated successfully!', 'success');
    }

    editLanguageContent() {
        const selectedLanguage = document.getElementById('adminLanguage').value;
        this.changeLanguage(selectedLanguage);
        this.showNotification(`Switched to ${selectedLanguage.toUpperCase()} for editing`, 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        
        // Set background color based on type
        switch(type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                break;
            case 'info':
                notification.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #ffd700, #ffed4e)';
                notification.style.color = '#000';
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS for admin panel and profile modal
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    .profile-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    }

    .profile-modal {
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        border-radius: 15px;
        border: 2px solid #ffd700;
        min-width: 400px;
        max-width: 500px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
        overflow: hidden;
    }

    .profile-modal-header {
        background: linear-gradient(135deg, #ffd700, #ffed4e);
        color: #000;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .profile-modal-header h3 {
        margin: 0;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
    }

    .close-modal {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #000;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .profile-modal-body {
        padding: 30px;
    }

    .profile-field {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 0;
        border-bottom: 1px solid #333;
    }

    .profile-field:last-child {
        border-bottom: none;
    }

    .profile-field label {
        font-weight: 600;
        color: #ffd700;
        min-width: 80px;
    }

    .profile-field span {
        color: #fff;
        text-align: right;
        flex: 1;
    }

    .profile-modal-footer {
        padding: 20px 30px;
        background: rgba(0, 0, 0, 0.3);
    }

    .logout-btn {
        width: 100%;
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-family: 'Poppins', sans-serif;
        transition: all 0.3s ease;
    }

    .logout-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(231, 76, 60, 0.3);
    }

    .admin-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        padding: 30px;
        border-radius: 15px;
        border: 2px solid #ffd700;
        z-index: 10000;
        min-width: 400px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
    }
    
    .admin-panel h3 {
        color: #ffd700;
        margin-bottom: 20px;
        font-family: 'Poppins', sans-serif;
    }
    
    .admin-section {
        margin-bottom: 20px;
    }
    
    .admin-section label {
        display: block;
        color: #fff;
        margin-bottom: 8px;
        font-weight: 500;
    }
    
    .admin-section input,
    .admin-section select {
        width: 100%;
        padding: 10px;
        background: #0a0a0a;
        border: 1px solid #ffd700;
        border-radius: 8px;
        color: #fff;
        margin-bottom: 10px;
    }
    
    .admin-section button {
        background: linear-gradient(135deg, #ffd700, #ffed4e);
        color: #000;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 400;
        transition: all 0.3s ease;
    }
    
    .admin-section button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
    }
    
    .close-admin {
        background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
        color: #fff !important;
        width: 100%;
        margin-top: 10px;
    }
    
    .animate-in {
        animation: slideInUp 0.6s ease-out forwards;
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .header.scrolled {
        background: rgba(10, 10, 10, 0.98);
        box-shadow: 0 4px 20px rgba(255, 215, 0, 0.2);
    }
    
    .nav-menu.active {
        display: flex;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: rgba(10, 10, 10, 0.98);
        flex-direction: column;
        padding: 20px;
        border-top: 2px solid #ffd700;
    }
    
    .hamburger.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
`;

document.head.appendChild(adminStyles);

// Initialize the application
let reddyAnnaKossu;

document.addEventListener('DOMContentLoaded', () => {
    reddyAnnaKossu = new ReddyAnnaKossu();
    
    // Add loading animation
    document.body.classList.add('loading');
    
    // Show welcome message
    setTimeout(() => {
        reddyAnnaKossu.showNotification('Welcome to Reddy Anna Kossu!', 'info');
    }, 1000);
});

// Create placeholder images directory structure
const createPlaceholderImages = () => {
    // This would create the necessary image files in a real implementation
    console.log('Creating placeholder images for hero section and games...');
};

// Export for global access
window.ReddyAnnaKossu = ReddyAnnaKossu;

