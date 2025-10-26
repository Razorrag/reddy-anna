class ScreenShareApp {
    constructor() {
        this.mediaStream = null;
        this.isSharing = false;
        this.viewerCount = 0;
        this.cropArea = null;
        this.isCropMode = false;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.currentViewMode = 'desktop'; // 'desktop' or 'mobile'
        this.isSectionMode = false;
        this.sectionArea = null;
        this.isResizing = false;
        this.resizeHandle = null;
        this.sectionStart = null;
        this.sectionEnd = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeViewMode();
        this.updateUI();
    }

    initializeElements() {
        this.screenVideo = document.getElementById('screenVideo');
        this.placeholder = document.getElementById('placeholder');
        this.startBtn = document.getElementById('startBtn');
        this.cropBtn = document.getElementById('cropBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.status = document.getElementById('status');
        this.viewerCountEl = document.getElementById('viewerCount');
        this.notification = document.getElementById('notification');
        
        // Crop elements
        this.cropOverlay = document.getElementById('cropOverlay');
        this.cropSelection = document.getElementById('cropSelection');
        this.confirmCrop = document.getElementById('confirmCrop');
        this.cancelCrop = document.getElementById('cancelCrop');
        
        // View mode elements
        this.desktopViewBtn = document.getElementById('desktopViewBtn');
        this.mobileViewBtn = document.getElementById('mobileViewBtn');
        
        // Section elements
        this.sectionBtn = document.getElementById('sectionBtn');
        this.sectionOverlay = document.getElementById('sectionOverlay');
        this.sectionSelection = document.getElementById('sectionSelection');
        this.confirmSection = document.getElementById('confirmSection');
        this.cancelSection = document.getElementById('cancelSection');
        this.increaseWidth = document.getElementById('increaseWidth');
        this.decreaseWidth = document.getElementById('decreaseWidth');
        this.increaseHeight = document.getElementById('increaseHeight');
        this.decreaseHeight = document.getElementById('decreaseHeight');
        this.sectionInfo = document.getElementById('sectionInfo');
        this.sectionDimensions = document.getElementById('sectionDimensions');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startScreenShare());
        this.cropBtn.addEventListener('click', () => this.toggleCropMode());
        this.sectionBtn.addEventListener('click', () => this.toggleSectionMode());
        this.stopBtn.addEventListener('click', () => this.stopScreenShare());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Crop events
        this.confirmCrop.addEventListener('click', () => this.confirmCropSelection());
        this.cancelCrop.addEventListener('click', () => this.cancelCropSelection());
        
        // View mode events
        this.desktopViewBtn.addEventListener('click', () => this.setViewMode('desktop'));
        this.mobileViewBtn.addEventListener('click', () => this.setViewMode('mobile'));
        
        // Section events
        this.confirmSection.addEventListener('click', () => this.confirmSectionSelection());
        this.cancelSection.addEventListener('click', () => this.cancelSectionSelection());
        this.increaseWidth.addEventListener('click', () => this.adjustSectionWidth(20));
        this.decreaseWidth.addEventListener('click', () => this.adjustSectionWidth(-20));
        this.increaseHeight.addEventListener('click', () => this.adjustSectionHeight(20));
        this.decreaseHeight.addEventListener('click', () => this.adjustSectionHeight(-20));
        
        // Crop selection events
        this.cropOverlay.addEventListener('mousedown', (e) => this.startCropSelection(e));
        this.cropOverlay.addEventListener('mousemove', (e) => this.updateCropSelection(e));
        this.cropOverlay.addEventListener('mouseup', (e) => this.endCropSelection(e));
        
        // Section selection events
        this.sectionOverlay.addEventListener('mousedown', (e) => this.startSectionSelection(e));
        this.sectionOverlay.addEventListener('mousemove', (e) => this.updateSectionSelection(e));
        this.sectionOverlay.addEventListener('mouseup', (e) => this.endSectionSelection(e));
        
        // Resize handle events
        this.sectionSelection.addEventListener('mousedown', (e) => this.startResize(e));
        document.addEventListener('mousemove', (e) => this.updateResize(e));
        document.addEventListener('mouseup', (e) => this.endResize(e));
        
        // Handle fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
        
        // Handle window resize for auto view mode detection
        window.addEventListener('resize', () => this.handleWindowResize());
    }

    async startScreenShare() {
        try {
            this.showNotification('Starting screen share...', 'info');
            this.updateStatus('Connecting...');
            
            // Request screen capture
            this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });

            // Set up video element
            this.screenVideo.srcObject = this.mediaStream;
            this.screenVideo.style.display = 'block';
            this.placeholder.style.display = 'none';

            // Handle stream end (when user stops sharing from browser)
            this.mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopScreenShare();
            });

            // Handle audio tracks
            const audioTracks = this.mediaStream.getAudioTracks();
            if (audioTracks.length > 0) {
                console.log('Audio sharing enabled');
            }

            this.isSharing = true;
            this.updateUI();
            this.updateStatus('Sharing');
            this.showNotification('Screen sharing started successfully!', 'success');
            
            // Simulate viewer count (in a real app, this would come from a server)
            this.simulateViewerCount();

        } catch (error) {
            console.error('Error starting screen share:', error);
            this.handleError(error);
        }
    }

    stopScreenShare() {
        if (this.mediaStream) {
            // Stop all tracks
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.mediaStream = null;
        }

        this.screenVideo.srcObject = null;
        this.screenVideo.style.display = 'none';
        this.placeholder.style.display = 'block';
        
        this.isSharing = false;
        this.viewerCount = 0;
        this.updateUI();
        this.updateStatus('Ready');
        this.showNotification('Screen sharing stopped', 'info');
    }

    toggleFullscreen() {
        const videoContainer = document.querySelector('.video-container');
        
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && 
            !document.msFullscreenElement) {
            // Enter fullscreen
            if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen();
            } else if (videoContainer.webkitRequestFullscreen) {
                videoContainer.webkitRequestFullscreen();
            } else if (videoContainer.mozRequestFullScreen) {
                videoContainer.mozRequestFullScreen();
            } else if (videoContainer.msRequestFullscreen) {
                videoContainer.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    handleFullscreenChange() {
        const videoContainer = document.querySelector('.video-container');
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement);
        
        if (isFullscreen) {
            videoContainer.classList.add('fullscreen');
        } else {
            videoContainer.classList.remove('fullscreen');
        }
    }

    simulateViewerCount() {
        // Simulate random viewer count changes
        setInterval(() => {
            if (this.isSharing) {
                this.viewerCount = Math.floor(Math.random() * 10) + 1;
                this.updateViewerCount();
            }
        }, 3000);
    }

    updateUI() {
        this.startBtn.disabled = this.isSharing || this.isCropMode || this.isSectionMode;
        this.cropBtn.disabled = this.isSharing || this.isSectionMode;
        this.sectionBtn.disabled = this.isSharing || this.isCropMode;
        this.stopBtn.disabled = !this.isSharing;
        this.fullscreenBtn.disabled = !this.isSharing;
        
        if (this.isSharing) {
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> Sharing...';
        } else if (this.isCropMode) {
            this.startBtn.innerHTML = '<i class="fas fa-crop"></i> Select Area First';
        } else if (this.isSectionMode) {
            this.startBtn.innerHTML = '<i class="fas fa-vector-square"></i> Select Section First';
        } else {
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> Start Sharing';
        }
        
        if (this.isCropMode) {
            this.cropBtn.innerHTML = '<i class="fas fa-crop"></i> Selecting...';
        } else {
            this.cropBtn.innerHTML = '<i class="fas fa-crop"></i> Crop Area';
        }
        
        if (this.isSectionMode) {
            this.sectionBtn.innerHTML = '<i class="fas fa-vector-square"></i> Selecting...';
        } else {
            this.sectionBtn.innerHTML = '<i class="fas fa-vector-square"></i> Select Section';
        }
        
        // Update view mode buttons
        this.updateViewModeButtons();
    }

    updateStatus(status) {
        this.status.textContent = status;
    }

    updateViewerCount() {
        this.viewerCountEl.textContent = this.viewerCount;
    }

    showNotification(message, type = 'info') {
        this.notification.textContent = message;
        this.notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }

    handleError(error) {
        let errorMessage = 'An error occurred while starting screen share.';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Screen sharing was denied. Please allow screen sharing and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No screen sharing source found.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Screen sharing is not supported in this browser.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Screen sharing source is not readable.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'Screen sharing constraints cannot be satisfied.';
        } else if (error.name === 'SecurityError') {
            errorMessage = 'Screen sharing is not allowed due to security restrictions.';
        }
        
        this.showNotification(errorMessage, 'error');
        this.updateStatus('Error');
        console.error('Screen share error:', error);
    }

    // Check browser support
    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            this.showNotification('Screen sharing is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.', 'error');
            this.startBtn.disabled = true;
            return false;
        }
        return true;
    }

    // Crop functionality methods
    toggleCropMode() {
        if (this.isCropMode) {
            this.exitCropMode();
        } else {
            this.enterCropMode();
        }
    }

    enterCropMode() {
        this.isCropMode = true;
        this.cropOverlay.classList.add('active');
        document.body.classList.add('crop-mode');
        this.updateUI();
        this.updateStatus('Select area to share');
        this.showNotification('Click and drag to select the area you want to share', 'info');
    }

    exitCropMode() {
        this.isCropMode = false;
        this.cropOverlay.classList.remove('active');
        document.body.classList.remove('crop-mode');
        this.cropSelection.classList.remove('active');
        this.cropArea = null;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.updateUI();
        this.updateStatus('Ready');
    }

    startCropSelection(e) {
        if (!this.isCropMode) return;
        
        e.preventDefault();
        this.isSelecting = true;
        this.selectionStart = { x: e.clientX, y: e.clientY };
        this.selectionEnd = { x: e.clientX, y: e.clientY };
        
        this.cropSelection.classList.add('active');
        this.updateCropSelectionDisplay();
    }

    updateCropSelection(e) {
        if (!this.isSelecting || !this.isCropMode) return;
        
        e.preventDefault();
        this.selectionEnd = { x: e.clientX, y: e.clientY };
        this.updateCropSelectionDisplay();
    }

    endCropSelection(e) {
        if (!this.isSelecting || !this.isCropMode) return;
        
        e.preventDefault();
        this.isSelecting = false;
        
        // Validate selection size
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        if (width < 50 || height < 50) {
            this.showNotification('Selection too small. Please select a larger area.', 'error');
            this.cropSelection.classList.remove('active');
            return;
        }
        
        this.cropArea = {
            x: Math.min(this.selectionStart.x, this.selectionEnd.x),
            y: Math.min(this.selectionStart.y, this.selectionEnd.y),
            width: width,
            height: height
        };
        
        this.showNotification('Area selected! Click "Confirm Selection" to proceed.', 'success');
    }

    updateCropSelectionDisplay() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        this.cropSelection.style.left = x + 'px';
        this.cropSelection.style.top = y + 'px';
        this.cropSelection.style.width = width + 'px';
        this.cropSelection.style.height = height + 'px';
    }

    confirmCropSelection() {
        if (!this.cropArea) {
            this.showNotification('Please select an area first', 'error');
            return;
        }
        
        this.exitCropMode();
        this.startScreenShareWithCrop();
    }

    cancelCropSelection() {
        this.exitCropMode();
        this.showNotification('Crop selection cancelled', 'info');
    }

    async startScreenShareWithCrop() {
        try {
            this.showNotification('Starting cropped screen share...', 'info');
            this.updateStatus('Connecting...');
            
            // Request screen capture
            this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });

            // Set up video element
            this.screenVideo.srcObject = this.mediaStream;
            this.screenVideo.style.display = 'block';
            this.placeholder.style.display = 'none';

            // Apply crop to video element
            this.applyCropToVideo();

            // Handle stream end
            this.mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopScreenShare();
            });

            this.isSharing = true;
            this.updateUI();
            this.updateStatus('Sharing (Cropped)');
            this.showNotification('Cropped screen sharing started!', 'success');
            
            this.simulateViewerCount();

        } catch (error) {
            console.error('Error starting cropped screen share:', error);
            this.handleError(error);
        }
    }

    applyCropToVideo() {
        if (!this.cropArea) return;
        
        // Calculate crop dimensions relative to screen
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        
        const cropX = (this.cropArea.x / window.innerWidth) * screenWidth;
        const cropY = (this.cropArea.y / window.innerHeight) * screenHeight;
        const cropWidth = (this.cropArea.width / window.innerWidth) * screenWidth;
        const cropHeight = (this.cropArea.height / window.innerHeight) * screenHeight;
        
        // Apply CSS clip-path for visual cropping
        this.screenVideo.style.clipPath = `polygon(${cropX}px ${cropY}px, ${cropX + cropWidth}px ${cropY}px, ${cropX + cropWidth}px ${cropY + cropHeight}px, ${cropX}px ${cropY + cropHeight}px)`;
        
        // Note: For actual video cropping, you would need to use Canvas API
        // or video processing libraries. This is a visual representation.
        console.log('Crop area applied:', {
            x: cropX,
            y: cropY,
            width: cropWidth,
            height: cropHeight
        });
    }

    // View mode functionality
    initializeViewMode() {
        // Set initial view mode
        this.setViewMode(this.currentViewMode);
        
        // Auto-detect screen size and set appropriate view mode
        this.autoDetectViewMode();
    }

    setViewMode(mode) {
        this.currentViewMode = mode;
        
        // Remove existing view classes
        document.body.classList.remove('desktop-view', 'mobile-view');
        
        // Add new view class
        document.body.classList.add(`${mode}-view`);
        
        // Update button states
        this.updateViewModeButtons();
        
        // Show notification
        const modeName = mode === 'desktop' ? 'Desktop' : 'Mobile';
        this.showNotification(`Switched to ${modeName} view`, 'info');
        
        // Update status
        this.updateStatus(`Ready (${modeName} view)`);
    }

    updateViewModeButtons() {
        // Update desktop button
        if (this.currentViewMode === 'desktop') {
            this.desktopViewBtn.classList.add('active');
            this.mobileViewBtn.classList.remove('active');
        } else {
            this.desktopViewBtn.classList.remove('active');
            this.mobileViewBtn.classList.add('active');
        }
    }

    autoDetectViewMode() {
        // Auto-detect based on screen size
        const isMobile = window.innerWidth <= 768;
        const detectedMode = isMobile ? 'mobile' : 'desktop';
        
        // Only auto-switch if not manually set
        if (this.currentViewMode !== detectedMode) {
            // Small delay to avoid jarring transitions
            setTimeout(() => {
                this.setViewMode(detectedMode);
            }, 500);
        }
    }

    // Get current view mode for external use
    getCurrentViewMode() {
        return this.currentViewMode;
    }

    // Check if currently in mobile view
    isMobileView() {
        return this.currentViewMode === 'mobile';
    }

    // Check if currently in desktop view
    isDesktopView() {
        return this.currentViewMode === 'desktop';
    }

    // Handle window resize
    handleWindowResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.autoDetectViewMode();
        }, 250);
    }

    // Section selection functionality
    toggleSectionMode() {
        if (this.isSectionMode) {
            this.exitSectionMode();
        } else {
            this.enterSectionMode();
        }
    }

    enterSectionMode() {
        this.isSectionMode = true;
        this.sectionOverlay.classList.add('active');
        document.body.classList.add('section-mode');
        this.updateUI();
        this.updateStatus('Select section to share');
        this.showNotification('Click and drag to create a section, then use resize handles to adjust', 'info');
    }

    exitSectionMode() {
        this.isSectionMode = false;
        this.sectionOverlay.classList.remove('active');
        document.body.classList.remove('section-mode');
        this.sectionSelection.classList.remove('active');
        this.sectionInfo.classList.remove('active');
        this.sectionArea = null;
        this.sectionStart = null;
        this.sectionEnd = null;
        this.updateUI();
        this.updateStatus('Ready');
    }

    startSectionSelection(e) {
        if (!this.isSectionMode || this.isResizing) return;
        
        e.preventDefault();
        this.isSelecting = true;
        this.sectionStart = { x: e.clientX, y: e.clientY };
        this.sectionEnd = { x: e.clientX, y: e.clientY };
        
        this.sectionSelection.classList.add('active');
        this.sectionInfo.classList.add('active');
        this.updateSectionSelectionDisplay();
    }

    updateSectionSelection(e) {
        if (!this.isSelecting || !this.isSectionMode) return;
        
        e.preventDefault();
        this.sectionEnd = { x: e.clientX, y: e.clientY };
        this.updateSectionSelectionDisplay();
    }

    endSectionSelection(e) {
        if (!this.isSelecting || !this.isSectionMode) return;
        
        e.preventDefault();
        this.isSelecting = false;
        
        // Validate selection size
        const width = Math.abs(this.sectionEnd.x - this.sectionStart.x);
        const height = Math.abs(this.sectionEnd.y - this.sectionStart.y);
        
        if (width < 100 || height < 100) {
            this.showNotification('Section too small. Please select a larger area.', 'error');
            this.sectionSelection.classList.remove('active');
            this.sectionInfo.classList.remove('active');
            return;
        }
        
        this.sectionArea = {
            x: Math.min(this.sectionStart.x, this.sectionEnd.x),
            y: Math.min(this.sectionStart.y, this.sectionEnd.y),
            width: width,
            height: height
        };
        
        this.showNotification('Section selected! Use resize handles or buttons to adjust size.', 'success');
    }

    updateSectionSelectionDisplay() {
        if (!this.sectionStart || !this.sectionEnd) return;
        
        const x = Math.min(this.sectionStart.x, this.sectionEnd.x);
        const y = Math.min(this.sectionStart.y, this.sectionEnd.y);
        const width = Math.abs(this.sectionEnd.x - this.sectionStart.x);
        const height = Math.abs(this.sectionEnd.y - this.sectionStart.y);
        
        this.sectionSelection.style.left = x + 'px';
        this.sectionSelection.style.top = y + 'px';
        this.sectionSelection.style.width = width + 'px';
        this.sectionSelection.style.height = height + 'px';
        
        // Update dimensions display
        this.sectionDimensions.textContent = `${Math.round(width)} x ${Math.round(height)}`;
        
        // Update section area
        this.sectionArea = { x, y, width, height };
    }

    confirmSectionSelection() {
        if (!this.sectionArea) {
            this.showNotification('Please select a section first', 'error');
            return;
        }
        
        this.exitSectionMode();
        this.startScreenShareWithSection();
    }

    cancelSectionSelection() {
        this.exitSectionMode();
        this.showNotification('Section selection cancelled', 'info');
    }

    // Resize handle functionality
    startResize(e) {
        if (!this.isSectionMode || !this.sectionArea) return;
        
        const handle = e.target.closest('.resize-handle');
        if (!handle) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        this.resizeHandle = handle.classList[1]; // Get direction (nw, ne, sw, se, n, s, e, w)
        this.sectionStart = { x: e.clientX, y: e.clientY };
        
        // Store original section area
        this.originalSectionArea = { ...this.sectionArea };
    }

    updateResize(e) {
        if (!this.isResizing || !this.sectionArea) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - this.sectionStart.x;
        const deltaY = e.clientY - this.sectionStart.y;
        
        let newArea = { ...this.originalSectionArea };
        
        // Apply resize based on handle direction
        switch (this.resizeHandle) {
            case 'nw':
                newArea.x += deltaX;
                newArea.y += deltaY;
                newArea.width -= deltaX;
                newArea.height -= deltaY;
                break;
            case 'ne':
                newArea.y += deltaY;
                newArea.width += deltaX;
                newArea.height -= deltaY;
                break;
            case 'sw':
                newArea.x += deltaX;
                newArea.width -= deltaX;
                newArea.height += deltaY;
                break;
            case 'se':
                newArea.width += deltaX;
                newArea.height += deltaY;
                break;
            case 'n':
                newArea.y += deltaY;
                newArea.height -= deltaY;
                break;
            case 's':
                newArea.height += deltaY;
                break;
            case 'e':
                newArea.width += deltaX;
                break;
            case 'w':
                newArea.x += deltaX;
                newArea.width -= deltaX;
                break;
        }
        
        // Ensure minimum size
        if (newArea.width < 100) {
            if (this.resizeHandle.includes('w')) {
                newArea.x = this.originalSectionArea.x + this.originalSectionArea.width - 100;
            }
            newArea.width = 100;
        }
        if (newArea.height < 100) {
            if (this.resizeHandle.includes('n')) {
                newArea.y = this.originalSectionArea.y + this.originalSectionArea.height - 100;
            }
            newArea.height = 100;
        }
        
        this.sectionArea = newArea;
        this.updateSectionFromArea();
    }

    endResize(e) {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.resizeHandle = null;
        this.originalSectionArea = null;
    }

    updateSectionFromArea() {
        if (!this.sectionArea) return;
        
        this.sectionSelection.style.left = this.sectionArea.x + 'px';
        this.sectionSelection.style.top = this.sectionArea.y + 'px';
        this.sectionSelection.style.width = this.sectionArea.width + 'px';
        this.sectionSelection.style.height = this.sectionArea.height + 'px';
        
        this.sectionDimensions.textContent = `${Math.round(this.sectionArea.width)} x ${Math.round(this.sectionArea.height)}`;
    }

    // Button-based size adjustments
    adjustSectionWidth(delta) {
        if (!this.sectionArea) return;
        
        const newWidth = Math.max(100, this.sectionArea.width + delta);
        this.sectionArea.width = newWidth;
        this.updateSectionFromArea();
    }

    adjustSectionHeight(delta) {
        if (!this.sectionArea) return;
        
        const newHeight = Math.max(100, this.sectionArea.height + delta);
        this.sectionArea.height = newHeight;
        this.updateSectionFromArea();
    }

    async startScreenShareWithSection() {
        try {
            this.showNotification('Starting section screen share...', 'info');
            this.updateStatus('Connecting...');
            
            // Request screen capture
            this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });

            // Set up video element
            this.screenVideo.srcObject = this.mediaStream;
            this.screenVideo.style.display = 'block';
            this.placeholder.style.display = 'none';

            // Apply section crop to video element
            this.applySectionToVideo();

            // Handle stream end
            this.mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopScreenShare();
            });

            this.isSharing = true;
            this.updateUI();
            this.updateStatus('Sharing (Section)');
            this.showNotification('Section screen sharing started!', 'success');
            
            this.simulateViewerCount();

        } catch (error) {
            console.error('Error starting section screen share:', error);
            this.handleError(error);
        }
    }

    applySectionToVideo() {
        if (!this.sectionArea) return;
        
        // Calculate section dimensions relative to screen
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        
        const sectionX = (this.sectionArea.x / window.innerWidth) * screenWidth;
        const sectionY = (this.sectionArea.y / window.innerHeight) * screenHeight;
        const sectionWidth = (this.sectionArea.width / window.innerWidth) * screenWidth;
        const sectionHeight = (this.sectionArea.height / window.innerHeight) * screenHeight;
        
        // Apply CSS clip-path for visual section cropping
        this.screenVideo.style.clipPath = `polygon(${sectionX}px ${sectionY}px, ${sectionX + sectionWidth}px ${sectionY}px, ${sectionX + sectionWidth}px ${sectionY + sectionHeight}px, ${sectionX}px ${sectionY + sectionHeight}px)`;
        
        console.log('Section area applied:', {
            x: sectionX,
            y: sectionY,
            width: sectionWidth,
            height: sectionHeight
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ScreenShareApp();
    
    // Check browser support
    if (!app.checkBrowserSupport()) {
        return;
    }
    
    // Add some additional features
    addKeyboardShortcuts(app);
    addPerformanceMonitoring(app);
});

// Keyboard shortcuts
function addKeyboardShortcuts(app) {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Shift + S to start/stop sharing
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            if (app.isSharing) {
                app.stopScreenShare();
            } else {
                app.startScreenShare();
            }
        }
        
        // Ctrl/Cmd + Shift + C to toggle crop mode
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            app.toggleCropMode();
        }
        
        // Ctrl/Cmd + Shift + D for desktop view
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            app.setViewMode('desktop');
        }
        
        // Ctrl/Cmd + Shift + M for mobile view
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
            e.preventDefault();
            app.setViewMode('mobile');
        }
        
        // F11 or Escape for fullscreen
        if (e.key === 'F11') {
            e.preventDefault();
            app.toggleFullscreen();
        }
        
        if (e.key === 'Escape') {
            if (app.isCropMode) {
                e.preventDefault();
                app.cancelCropSelection();
            } else if (app.isSharing) {
                app.toggleFullscreen();
            }
        }
        
        // Enter to confirm crop selection
        if (e.key === 'Enter' && app.isCropMode && app.cropArea) {
            e.preventDefault();
            app.confirmCropSelection();
        }
    });
}

// Performance monitoring
function addPerformanceMonitoring(app) {
    let frameCount = 0;
    let lastTime = performance.now();
    
    function measureFPS() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
            const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
            console.log(`Screen share FPS: ${fps}`);
            
            frameCount = 0;
            lastTime = currentTime;
        }
        
        if (app.isSharing) {
            requestAnimationFrame(measureFPS);
        }
    }
    
    // Start FPS monitoring when sharing starts
    const originalStart = app.startScreenShare.bind(app);
    app.startScreenShare = async function() {
        await originalStart();
        if (app.isSharing) {
            measureFPS();
        }
    };
}

// Service Worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
