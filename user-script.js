// User Portal - Complete Session Management & Security System
// ===========================================================

// Global State
let userState = {
    isAuthenticated: false,
    sessionActive: false,
    currentUser: null,
    sessionId: null,
    sessionStartTime: null,
    lastActivityTime: null,
    currentFileId: null,
    clientIp: 'Unknown',
    files: [],
    activityLogs: []
};

// Configuration
const CONFIG = {
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
    INACTIVITY_WARNING: 29 * 60 * 1000, // Warn at 29 minutes
    OTP_VALIDITY: 5 * 60 * 1000, // 5 minutes
    CHECK_INTERVAL: 10 * 1000, // Check every 10 seconds
    API_BASE: (() => {
        if (typeof window === 'undefined') return 'http://localhost:3000';
        const origin = window.location.origin;
        if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
            return origin;
        }
        return 'http://localhost:3000';
    })()
};

let otpTimestamp = null;
let sessionCheckInterval = null;
let inactivityTimeout = null;
let warningTimeout = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeSystem();
    setupEventListeners();
    fetchClientIp();
    checkExistingSession();
    loadFiles();
    renderFiles();

    // Check for direct file link (?fileId=xxx)
    handleDirectFileLink();

    // Setup session monitoring
    setupSessionMonitoring();
    setupVisibilityChangeDetection();
    setupActivityTracking();
});

// Initialize system
function initializeSystem() {
    console.log('Secure Document Portal Initialized');
}

// Fetch client IP from server
async function fetchClientIp() {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/client-ip`);
        const data = await res.json();
        if (data.ip) userState.clientIp = data.ip;
    } catch (_) {}
}

// Setup event listeners
function setupEventListeners() {
    // Auth form
    document.getElementById('authForm').addEventListener('submit', handleAuthentication);
    
    // OTP form
    document.getElementById('otpForm').addEventListener('submit', handleOtpVerification);
    
    // OTP input auto-focus
    setupOtpInputs();
}

// Setup OTP inputs
function setupOtpInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
}

// ============================================
// SESSION MANAGEMENT
// ============================================

// Check for existing session
function checkExistingSession() {
    const savedSession = localStorage.getItem('userSession');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedSession && savedUser) {
        const session = JSON.parse(savedSession);
        const user = JSON.parse(savedUser);
        
        // Check if session is still valid
        const sessionAge = Date.now() - session.startTime;
        const lastActivity = Date.now() - session.lastActivity;
        
        if (sessionAge < CONFIG.SESSION_TIMEOUT && lastActivity < CONFIG.SESSION_TIMEOUT) {
            // Restore session
            restoreSession(session, user);
        } else {
            // Session expired
            clearSession();
        }
    }
}

// Restore existing session
function restoreSession(session, user) {
    userState.isAuthenticated = true;
    userState.sessionActive = true;
    userState.currentUser = user;
    userState.sessionId = session.sessionId;
    userState.sessionStartTime = session.startTime;
    userState.lastActivityTime = session.lastActivity;
    
    showSessionBanner();
    updateSessionInfo();
    
    console.log('%c✅ Session Restored', 'color: #28a745; font-size: 14px; font-weight: bold;');
    logActivity('session_restored', null);
}

// Create new session
function createSession(user) {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    const now = Date.now();
    
    userState.isAuthenticated = true;
    userState.sessionActive = true;
    userState.currentUser = user;
    userState.sessionId = sessionId;
    userState.sessionStartTime = now;
    userState.lastActivityTime = now;
    
    // Save to localStorage
    const sessionData = {
        sessionId: sessionId,
        startTime: now,
        lastActivity: now
    };
    
    localStorage.setItem('userSession', JSON.stringify(sessionData));
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    showSessionBanner();
    updateSessionInfo();
    
    console.log('%c✅ New Session Created', 'color: #28a745; font-size: 14px; font-weight: bold;');
    logActivity('session_created', null);
}

// Update session activity
function updateSessionActivity() {
    if (!userState.sessionActive) return;
    
    const now = Date.now();
    userState.lastActivityTime = now;
    
    // Update localStorage
    const savedSession = JSON.parse(localStorage.getItem('userSession'));
    if (savedSession) {
        savedSession.lastActivity = now;
        localStorage.setItem('userSession', JSON.stringify(savedSession));
    }
    
    // Reset inactivity timers
    clearTimeout(inactivityTimeout);
    clearTimeout(warningTimeout);
    hideSessionWarning();
    setupInactivityTimers();
}

// Setup session monitoring
function setupSessionMonitoring() {
    // Check session every 10 seconds
    sessionCheckInterval = setInterval(() => {
        if (!userState.sessionActive) return;
        
        const sessionAge = Date.now() - userState.sessionStartTime;
        const lastActivity = Date.now() - userState.lastActivityTime;
        
        // Check if session expired
        if (sessionAge > CONFIG.SESSION_TIMEOUT || lastActivity > CONFIG.SESSION_TIMEOUT) {
            console.log('%c⏰ Session Expired', 'color: #dc3545; font-size: 14px;');
            expireSession();
        }
    }, CONFIG.CHECK_INTERVAL);
    
    setupInactivityTimers();
}

// Setup inactivity timers
function setupInactivityTimers() {
    // Show warning before expiry
    warningTimeout = setTimeout(() => {
        if (userState.sessionActive) {
            showSessionWarning();
        }
    }, CONFIG.INACTIVITY_WARNING);
    
    // Auto logout after timeout
    inactivityTimeout = setTimeout(() => {
        if (userState.sessionActive) {
            console.log('%c⏰ Session Timeout Due to Inactivity', 'color: #ffc107; font-size: 14px;');
            expireSession();
        }
    }, CONFIG.SESSION_TIMEOUT);
}

// Detect page visibility change (sleep/wake)
function setupVisibilityChangeDetection() {
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            console.log('%c System Going to Sleep', 'color: #999; font-size: 12px;');
            logActivity('system_sleep_detected', null);
        } else {
            console.log('% System Woke Up', 'color: #999; font-size: 12px;');
            
            if (userState.sessionActive) {
                // Check session validity after wake
                const lastActivity = Date.now() - userState.lastActivityTime;
                if (lastActivity > CONFIG.SESSION_TIMEOUT) {
                    console.log('%c🔒 Session Expired During Sleep', 'color: #dc3545; font-size: 14px;');
                    expireSession();
                } else {
                    updateSessionActivity();
                }
            }
        }
    });
}

// Setup activity tracking
function setupActivityTracking() {
    // Track user interactions
    ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
            if (userState.sessionActive) {
                updateSessionActivity();
            }
        }, { passive: true });
    });
}

// Show session banner
function showSessionBanner() {
    document.getElementById('sessionBanner').style.display = 'block';
    document.getElementById('userSession').style.display = 'flex';
}

// Hide session banner
function hideSessionBanner() {
    document.getElementById('sessionBanner').style.display = 'none';
    document.getElementById('userSession').style.display = 'none';
}

// Update session info
function updateSessionInfo() {
    if (userState.currentUser) {
        document.getElementById('sessionUserName').textContent = userState.currentUser.name;
    }
}

// Show session warning
function showSessionWarning() {
    document.getElementById('sessionWarning').style.display = 'flex';
    let countdown = 60;
    
    const warningInterval = setInterval(() => {
        countdown--;
        document.getElementById('warningTimer').textContent = countdown;
        
        if (countdown <= 0 || !userState.sessionActive) {
            clearInterval(warningInterval);
            hideSessionWarning();
        }
    }, 1000);
}

// Hide session warning
function hideSessionWarning() {
    document.getElementById('sessionWarning').style.display = 'none';
}

// Extend session
function extendSession() {
    updateSessionActivity();
    hideSessionWarning();
    console.log('%c🔄 Session Extended', 'color: #28a745; font-size: 14px;');
    logActivity('session_extended', null);
}

// Expire session
function expireSession() {
    logActivity('session_expired', null);
    clearSession();
    alert('Your session has expired due to inactivity or sleep mode. Please login again.');
}

// Clear session
function clearSession() {
    userState.isAuthenticated = false;
    userState.sessionActive = false;
    userState.currentUser = null;
    userState.sessionId = null;
    userState.sessionStartTime = null;
    userState.lastActivityTime = null;
    
    localStorage.removeItem('userSession');
    localStorage.removeItem('currentUser');
    
    hideSessionBanner();
    
    clearInterval(sessionCheckInterval);
    clearTimeout(inactivityTimeout);
    clearTimeout(warningTimeout);
    
    console.log('%c🔒 Session Cleared', 'color: #666; font-size: 14px;');
}

// User logout
function userLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logActivity('user_logout', null);
        clearSession();
        location.reload();
    }
}

// Force session out (no confirm) - used for security violations e.g. screenshot on download-disabled file
function forceSessionOut(reason) {
    logActivity('security_violation_session_ended', null, reason);
    clearSession();
    const modal = document.getElementById('viewerModal');
    if (modal) modal.style.display = 'none';
    location.reload();
}

// ============================================
// AUTHENTICATION & OTP
// ============================================

// Handle authentication
async function handleAuthentication(e) {
    e.preventDefault();

    const name = document.getElementById('userName').value.trim();
    const mobile = document.getElementById('userMobile').value.trim();

    if (!name || !mobile) {
        alert('Please fill all fields');
        return;
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }

    userState.currentUser = {
        name: name,
        mobile: mobile,
        timestamp: new Date().toISOString()
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending OTP...</span>';
    }

    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });
        let data = {};
        try {
            data = await res.json();
        } catch (_) {
            throw new Error('Invalid server response');
        }

        if (!res.ok) {
            throw new Error(data.message || 'Failed to send OTP');
        }

        otpTimestamp = Date.now();
        let otpMsg = `OTP sent to your WhatsApp: ${mobile}. Enter the code below.`;
        if (data.devOtp) {
            otpMsg = `Your OTP: ${data.devOtp} (Twilio not configured - use this code to test)`;
        }
        document.getElementById('otpMessage').textContent = otpMsg;

        document.getElementById('authModal').style.display = 'none';
        document.getElementById('otpModal').style.display = 'block';
        startOtpTimer();

        logActivity('otp_sent', null);
    } catch (err) {
        console.error('OTP send error:', err);
        const msg = err.message || 'Unknown error';
        alert(`Failed to send OTP: ${msg}\n\nMake sure you open http://localhost:3000/user.html (not file://) and the server is running (npm start).`);
        logActivity('otp_sent', null);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// Start OTP timer
function startOtpTimer() {
    let timeLeft = 300; // 5 minutes
    
    const timerInterval = setInterval(() => {
        if (document.getElementById('otpModal').style.display === 'none') {
            clearInterval(timerInterval);
            return;
        }
        
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        document.getElementById('timerCount').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert('OTP expired. Please request a new one.');
            closeOtpModal();
        }
    }, 1000);
}

// Handle OTP verification
async function handleOtpVerification(e) {
    e.preventDefault();

    const enteredOtp = getEnteredOtp();

    if (enteredOtp.length !== 6) {
        alert('Please enter complete 6-digit OTP');
        return;
    }

    const otpAge = Date.now() - otpTimestamp;
    if (otpAge > CONFIG.OTP_VALIDITY) {
        alert('OTP has expired. Please request a new one.');
        closeOtpModal();
        return;
    }

    const mobile = userState.currentUser?.mobile;
    let verified = false;

    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, otp: enteredOtp })
        });
        let data = {};
        try {
            data = await res.json();
        } catch (_) {
            verified = false;
        }
        if (res.ok && data.success) verified = true;
    } catch (err) {
        verified = false;
    }

    if (verified) {
        console.log('%c✅ OTP Verified Successfully', 'color: #28a745; font-size: 14px; font-weight: bold;');

        saveUserToDatabase();
        createSession(userState.currentUser);
        closeOtpModal();

        if (userState.currentFileId) {
            openFileViewer(userState.currentFileId);
        }

        logActivity('otp_verified_success', null);
    } else {
        alert('Invalid OTP. Please try again.');
        clearOtpInputs();
        logActivity('otp_verification_failed', null);
    }
}

// Get entered OTP
function getEnteredOtp() {
    let otp = '';
    for (let i = 1; i <= 6; i++) {
        otp += document.getElementById(`otp${i}`).value;
    }
    return otp;
}

// Clear OTP inputs
function clearOtpInputs() {
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`otp${i}`).value = '';
    }
    document.getElementById('otp1').focus();
}

// Resend OTP
async function resendOtp() {
    const mobile = userState.currentUser?.mobile;
    if (!mobile) return;

    clearOtpInputs();
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });
        let data = {};
        try { data = await res.json(); } catch (_) { data = {}; }
        if (res.ok) {
            otpTimestamp = Date.now();
            document.getElementById('otpMessage').textContent = `OTP resent to ${mobile}`;
            startOtpTimer();
            logActivity('otp_resent', null);
        } else {
            alert(data.message || 'Failed to resend OTP');
        }
    } catch (err) {
        alert('Server unavailable. Open http://localhost:3000/user.html and run npm start.');
    }
}

// Close OTP modal
function closeOtpModal() {
    document.getElementById('otpModal').style.display = 'none';
    clearOtpInputs();
}

// ============================================
// FILE MANAGEMENT
// ============================================

// Load files from admin
function loadFiles() {
    const savedFiles = localStorage.getItem('adminFiles');
    if (savedFiles) {
        userState.files = JSON.parse(savedFiles).filter(f => f.status === 'active');
    }
}

// Render files
function renderFiles() {
    const filesGrid = document.getElementById('filesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (userState.files.length === 0) {
        filesGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    filesGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    filesGrid.innerHTML = userState.files.map(file => {
        const categoryIcons = {
            circulars: '',
            notices: '',
            results: '',
            timetables: '',
            announcements: '',
            documents: ''
        };
        
        return `
            <div class="file-card" data-category="${file.category}">
                <div class="file-icon">${categoryIcons[file.category] || ''}</div>
                <h3 class="file-title">${file.title}</h3>
                <p class="file-category">${file.category.toUpperCase()}</p>
                <p class="file-date">Published: ${new Date(file.publishDate).toLocaleDateString()}</p>
                <p class="file-description">${file.description}</p>
                <button class="view-file-btn" onclick="requestFileAccess('${file.id}')">
                    View Document
                </button>
            </div>
        `;
    }).join('');
}

// Handle direct file link (user.html?fileId=xxx)
function handleDirectFileLink() {
    const params = new URLSearchParams(window.location.search);
    const fileId = params.get('fileId');
    if (!fileId) return;

    const file = userState.files.find(f => f.id === fileId);
    if (!file) {
        alert('File not found or may have been removed.');
        return;
    }

    userState.currentFileId = fileId;

    if (userState.sessionActive && userState.isAuthenticated) {
        openFileViewer(fileId);
    } else {
        document.getElementById('authModal').style.display = 'block';
    }
}

// Filter by category
let currentCategory = 'all';

function filterByCategory(category) {
    currentCategory = category;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter files
    const fileCards = document.querySelectorAll('.file-card');
    fileCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Request file access
function requestFileAccess(fileId) {
    userState.currentFileId = fileId;
    
    // Check if session is active
    if (userState.sessionActive && userState.isAuthenticated) {
        // Session exists - direct access
        console.log('%c✅ Session Active - Direct Access', 'color: #28a745; font-size: 12px;');
        openFileViewer(fileId);
    } else {
        // No session - require authentication
        console.log('%c🔒 No Active Session - Authentication Required', 'color: #ffc107; font-size: 12px;');
        document.getElementById('authModal').style.display = 'block';
    }
}

// Record download and update admin data
function recordDownload(fileId) {
    const allFiles = JSON.parse(localStorage.getItem('adminFiles') || '[]');
    const idx = allFiles.findIndex(f => f.id === fileId);
    if (idx !== -1) {
        allFiles[idx].downloads = (allFiles[idx].downloads || 0) + 1;
        localStorage.setItem('adminFiles', JSON.stringify(allFiles));
        const file = userState.files.find(f => f.id === fileId);
        if (file) file.downloads = allFiles[idx].downloads;
    }
    logActivity('file_downloaded', userState.files.find(f => f.id === fileId)?.title);
}

// Open file viewer
function openFileViewer(fileId) {
    const file = userState.files.find(f => f.id === fileId);
    if (!file) {
        alert('File not found');
        return;
    }
    
    // Update view count
    file.views = (file.views || 0) + 1;
    const allFiles = JSON.parse(localStorage.getItem('adminFiles'));
    const fileIndex = allFiles.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
        allFiles[fileIndex].views = file.views;
        localStorage.setItem('adminFiles', JSON.stringify(allFiles));
    }
    
    // Set document content (support uploaded PDFs/Docs and legacy `content`)
    document.getElementById('documentTitle').textContent = file.title;
    const docContainer = document.getElementById('documentContent');
    const allowDownload = file.allowDownload === true;

    // Update viewer header: show download button or "Download Disabled"
    const downloadStatusEl = document.getElementById('viewerDownloadStatus');
    if (allowDownload && file.fileData) {
        downloadStatusEl.outerHTML = `<a href="#" id="viewerHeaderDownload" class="viewer-download-btn" download="${(file.fileName || file.title).replace(/"/g, '&quot;')}">Download</a>`;
        const dlBtn = document.getElementById('viewerHeaderDownload');
        dlBtn.href = file.fileData;
        dlBtn.download = file.fileName || file.title;
        dlBtn.onclick = function(e) {
            recordDownload(fileId);
        };
    } else {
        downloadStatusEl.outerHTML = '<span id="viewerDownloadStatus" class="no-download-notice">Download Disabled</span>';
    }

    if (file.fileData) {
        const ft = file.fileType || '';
        if (ft.includes('pdf')) {
            docContainer.innerHTML = `<embed src="${file.fileData}" type="application/pdf" width="100%" height="600px" />`;
        } else if (ft.startsWith('image/')) {
            docContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:400px;background:#1a1a1a;"><img src="${file.fileData}" alt="${file.title}" style="max-width:100%;max-height:70vh;object-fit:contain;" /></div>`;
        } else if (ft.startsWith('video/')) {
            docContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:400px;background:#000;"><video src="${file.fileData}" controls style="max-width:100%;max-height:70vh;"></video></div>`;
        } else {
            const isWord = ft.includes('msword') || ft.includes('wordprocessing');
            const isExcel = ft.includes('excel') || ft.includes('spreadsheet') || ft.includes('sheet');
            const docType = isWord ? 'Word Document' : isExcel ? 'Excel Spreadsheet' : 'Document';
            if (allowDownload) {
                docContainer.innerHTML = `
                    <div class="doc-placeholder doc-placeholder-office">
                        <div class="doc-placeholder-icon">${isWord ? 'DOC' : isExcel ? 'XLS' : 'FILE'}</div>
                        <h3>${docType}</h3>
                        <p class="doc-placeholder-name">${file.fileName || file.title}</p>
                        <p>This file cannot be previewed in the browser. Download it to view offline.</p>
                        <a id="viewerDownloadLink" class="doc-download-btn" href="#">Download File</a>
                    </div>
                `;
                setTimeout(() => {
                    const link = document.getElementById('viewerDownloadLink');
                    if (link) {
                        link.href = file.fileData;
                        link.download = file.fileName || file.title;
                        link.onclick = () => recordDownload(fileId);
                    }
                }, 20);
            } else {
                docContainer.innerHTML = `
                    <div class="doc-placeholder doc-placeholder-office">
                        <div class="doc-placeholder-icon">${isWord ? 'DOC' : isExcel ? 'XLS' : 'FILE'}</div>
                        <h3>${docType}</h3>
                        <p class="doc-placeholder-name">${file.fileName || file.title}</p>
                        <p>This file cannot be previewed in the browser. Download is disabled for this file.</p>
                    </div>
                `;
            }
        }
    } else if (file.content) {
        docContainer.innerHTML = file.content;
    } else {
        docContainer.innerHTML = '<p style="padding:20px;">No preview available for this file.</p>';
    }
    
    // Add watermark
    const watermarkText = `Dr. MCET College | Viewed by: ${userState.currentUser.name} | Mobile: ${userState.currentUser.mobile} | IP: ${userState.clientIp || 'Unknown'} | ${new Date().toLocaleString()}`;
    document.getElementById('userWatermark').textContent = watermarkText;
    
    // Show modal
    document.getElementById('viewerModal').style.display = 'block';
    
    // Enable security features
    enableSecurityFeatures();
    
    // Log activity & store open time for duration tracking
    logActivity('file_viewed', file.title);
    userState.viewOpenTime = Date.now();
    userState.viewingFileName = file.title;
    userState.currentViewingAllowDownload = allowDownload;

    console.log(`%c File Opened: ${file.title}`, 'color: #667eea; font-size: 14px;');
}

// Close viewer
function closeViewer() {
    const durationMs = userState.viewOpenTime ? Date.now() - userState.viewOpenTime : 0;
    const durationSec = Math.round(durationMs / 1000);
    const fileName = userState.viewingFileName || null;

    document.getElementById('viewerModal').style.display = 'none';
    logActivity('file_closed', fileName, undefined, { viewDurationSeconds: durationSec });

    userState.viewOpenTime = null;
    userState.viewingFileName = null;
    userState.currentViewingAllowDownload = null;
}

// ============================================
// SECURITY FEATURES
// ============================================

function enableSecurityFeatures() {
    const documentContent = document.getElementById('documentContent');
    
    // Only session out on screenshot when download is DISABLED. Use current state at event time.
    const onScreenshotDetected = () => {
        const allowDownload = userState.currentViewingAllowDownload === true;
        if (!allowDownload) {
            forceSessionOut('Screenshot attempted on download-disabled file');
        } else {
            blankPageTemporarily();
        }
    };
    
    // Prevent right-click
    documentContent.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        alert('Right-click is disabled for security');
        logActivity('security_right_click_blocked', null);
    });
    
    // Prevent keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // PrintScreen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            onScreenshotDetected();
            logActivity('security_screenshot_blocked_printscreen', null);
        }
        
        // Ctrl+P / Cmd+P (Print)
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            alert('Printing is not allowed');
            logActivity('security_print_blocked', null);
        }
        
        // Ctrl+S / Cmd+S (Save)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            alert('Saving is not allowed');
            logActivity('security_save_blocked', null);
        }
        
        // Ctrl+Shift+S (Windows Snip)
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            onScreenshotDetected();
            logActivity('security_screenshot_blocked_snip', null);
        }
        
        // Mac screenshots
        if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
            e.preventDefault();
            onScreenshotDetected();
            logActivity('security_screenshot_blocked_mac', null);
        }
    });
    
    // Window blur: Only treat as screenshot when download is DISABLED.
    // When download is allowed, blur often means user clicked Download and save dialog opened - do nothing.
    window.addEventListener('blur', function() {
        if (document.getElementById('viewerModal').style.display !== 'block') return;
        const allowDownload = userState.currentViewingAllowDownload === true;
        if (!allowDownload) {
            forceSessionOut('Screenshot attempted on download-disabled file');
            logActivity('security_window_blur_detected', null);
        }
    });
}

// Blank page temporarily
function blankPageTemporarily() {
    const content = document.getElementById('documentContent');
    const originalContent = content.innerHTML;
    
    content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:400px;flex-direction:column;">
            <h2 style="color:#dc3545;">SCREENSHOT PROTECTION ACTIVE</h2>
            <p style="color:#666;">Screenshots are not allowed</p>
        </div>
    `;
    
    setTimeout(() => {
        content.innerHTML = originalContent;
        const watermarkText = `Dr. MCET College | Viewed by: ${userState.currentUser.name} | Mobile: ${userState.currentUser.mobile} | IP: ${userState.clientIp || 'Unknown'} | ${new Date().toLocaleString()}`;
        document.getElementById('userWatermark').textContent = watermarkText;
    }, 2000);
}

// ============================================
// DATABASE & LOGGING
// ============================================

// Save user to database
function saveUserToDatabase() {
    let systemUsers = JSON.parse(localStorage.getItem('systemUsers') || '[]');
    
    const existingUser = systemUsers.find(u => u.mobile === userState.currentUser.mobile);
    if (!existingUser) {
        systemUsers.push(userState.currentUser);
        localStorage.setItem('systemUsers', JSON.stringify(systemUsers));
    }
}

// Log activity
function logActivity(activity, fileName) {
    // optional third: reason, fourth: extra fields (e.g. { viewDurationSeconds: N })
    const reason = arguments.length > 2 ? arguments[2] : undefined;
    const extra = (arguments.length > 3 && typeof arguments[3] === 'object' && arguments[3]) ? arguments[3] : {};

    const activityLog = {
        timestamp: new Date().toISOString(),
        userName: userState.currentUser?.name || 'Unknown',
        mobile: userState.currentUser?.mobile || 'Unknown',
        clientIp: userState.clientIp || 'Unknown',
        fileName: fileName,
        activity: activity,
        reason: reason || '',
        sessionId: userState.sessionId || 'no_session',
        userAgent: navigator.userAgent,
        ...extra
    };
    
    let activityLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
    activityLogs.push(activityLog);
    localStorage.setItem('activityLogs', JSON.stringify(activityLogs));
    
    console.log(`%c Activity Logged: ${activity}`, 'color: #999; font-size: 11px;');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal') && event.target.id !== 'viewerModal') {
        if (event.target.id === 'authModal') {
            // Don't allow closing auth modal by clicking outside
            return;
        }
        event.target.style.display = 'none';
    }
}

// Prevent accidental navigation
window.addEventListener('beforeunload', function(e) {
    if (document.getElementById('viewerModal').style.display === 'block') {
        e.preventDefault();
        e.returnValue = 'You have an open document. Are you sure you want to leave?';
    }
});

console.log('Dr. MCET College Document Portal Ready');
