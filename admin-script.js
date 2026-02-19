// Admin Panel - File Management System
// Global State Management
let adminState = {
    files: [],
    users: [],
    activityLogs: [],
    statistics: {
        totalFiles: 0,
        totalUsers: 0,
        totalViews: 0,
        blockedAttempts: 0
    }
};

// Load data from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    loadAdminData();
    setupEventListeners();
    renderDashboard();
    updateStatistics();
});

// Load existing data
function loadAdminData() {
    const savedFiles = localStorage.getItem('adminFiles');
    const savedLogs = localStorage.getItem('activityLogs');
    const savedUsers = localStorage.getItem('systemUsers');
    
    if (savedFiles) {
        adminState.files = JSON.parse(savedFiles);
    } else {
        // Load demo files if no data exists
        adminState.files = getDemoFiles();
        saveAdminData();
    }
    
    if (savedLogs) {
        adminState.activityLogs = JSON.parse(savedLogs);
    }
    
    if (savedUsers) {
        adminState.users = JSON.parse(savedUsers);
    }
}

// Save data to localStorage
function saveAdminData() {
    localStorage.setItem('adminFiles', JSON.stringify(adminState.files));
    localStorage.setItem('activityLogs', JSON.stringify(adminState.activityLogs));
    localStorage.setItem('systemUsers', JSON.stringify(adminState.users));
}

// Demo files for initial setup
function getDemoFiles() {
    return [
        {
            id: 'file_' + Date.now() + '_1',
            title: 'Examination Schedule - Fall 2025',
            category: 'circulars',
            description: 'Complete examination schedule with dates and timings',
            content: generateSampleContent('Examination Schedule'),
            publishDate: '2026-02-05',
            status: 'active',
            uploadDate: new Date().toISOString(),
            views: 0,
            downloads: 0
        },
        {
            id: 'file_' + Date.now() + '_2',
            title: 'Fee Structure Update 2026',
            category: 'notices',
            description: 'Updated fee structure for academic year 2025-26',
            content: generateSampleContent('Fee Structure'),
            publishDate: '2026-02-03',
            status: 'active',
            uploadDate: new Date().toISOString(),
            views: 0,
            downloads: 0
        },
        {
            id: 'file_' + Date.now() + '_3',
            title: 'Annual Day Celebration 2026',
            category: 'announcements',
            description: 'Information about upcoming annual day event',
            content: generateSampleContent('Annual Day'),
            publishDate: '2026-01-28',
            status: 'active',
            uploadDate: new Date().toISOString(),
            views: 0,
            downloads: 0
        }
    ];
}

// Generate sample content
function generateSampleContent(title) {
    return `
        <div class="document-header">
            <h1>ST. XAVIER'S COLLEGE</h1>
            <p>Autonomous Institution | Affiliated to State University</p>
            <p>123 Education Street, City - 600001</p>
        </div>
        
        <h2 class="document-title">${title.toUpperCase()}</h2>
        
        <div class="document-meta">
            <span><strong>Reference No:</strong> STX/2026/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</span>
            <span><strong>Date:</strong> ${new Date().toLocaleDateString()}</span>
        </div>
        
        <div class="document-body">
            <p>Dear Students and Staff,</p>
            
            <p>This is an important notification regarding ${title}. Please read the following information carefully.</p>
            
            <h3>Important Information:</h3>
            <ul>
                <li>This is a secure document viewable only after authentication</li>
                <li>Screenshots and downloads are disabled for security</li>
                <li>All access is logged and monitored</li>
                <li>Please contact the administration for any queries</li>
            </ul>
            
            <p>For more information, please visit the college office during working hours (9:00 AM - 4:00 PM).</p>
            
            <div class="document-footer">
                <div class="signature">
                    <p><strong>Principal</strong></p>
                    <p>St. Xavier's College</p>
                </div>
            </div>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Upload form
    document.getElementById('uploadForm').addEventListener('submit', handleFileUpload);
    
    // Edit form
    document.getElementById('editForm').addEventListener('submit', handleFileEdit);
    
    // Set default publish date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('publishDate').value = today;
}

// Handle file upload
function handleFileUpload(e) {
    e.preventDefault();

    const fileInput = document.getElementById('fileUpload');
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    // Validate file type and size (25MB limit)
    const allowed = [
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'video/mp4', 'video/webm', 'video/ogg',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
    ];
    if (!allowed.includes(file.type)) {
        alert('Unsupported file type. Use PDF, Word, Excel, Video (mp4/webm/ogg), or Images (jpg/png/gif/webp).');
        return;
    }
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File is too large. Maximum allowed size is 25MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        const dataUrl = evt.target.result;

        const fileDataObj = {
            id: 'file_' + Date.now(),
            title: document.getElementById('fileTitle').value || file.name,
            category: document.getElementById('fileCategory').value,
            description: document.getElementById('fileDescription').value || '',
            publishDate: document.getElementById('publishDate').value,
            status: document.getElementById('fileStatus').value,
            allowDownload: document.getElementById('allowDownload').checked,
            uploadDate: new Date().toISOString(),
            views: 0,
            downloads: 0,
            fileName: file.name,
            fileType: file.type,
            fileData: dataUrl
        };

        adminState.files.push(fileDataObj);
        saveAdminData();

        // Reset form
        e.target.reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('publishDate').value = today;

        // Show success message
        showSuccessMessage('File uploaded successfully!');

        // Update dashboard
        renderDashboard();
        updateStatistics();

        // Log activity
        logAdminActivity('file_uploaded', fileDataObj.title);
    };

    reader.readAsDataURL(file);
}

// Render dashboard
function renderDashboard() {
    renderFilesList();
    renderActivityLogs();
    renderViewDurationChart();
}

// Compute and render view duration chart
function renderViewDurationChart() {
    const chartEl = document.getElementById('viewDurationChart');
    const emptyEl = document.getElementById('viewDurationEmpty');
    if (!chartEl || !emptyEl) return;

    const closedLogs = adminState.activityLogs.filter(
        l => l.activity === 'file_closed' && typeof l.viewDurationSeconds === 'number' && l.fileName
    );

    if (closedLogs.length === 0) {
        chartEl.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }

    chartEl.style.display = 'block';
    emptyEl.style.display = 'none';

    const byFile = {};
    closedLogs.forEach(log => {
        const name = log.fileName || 'Unknown';
        if (!byFile[name]) byFile[name] = { total: 0, count: 0 };
        byFile[name].total += log.viewDurationSeconds;
        byFile[name].count += 1;
    });

    const data = Object.entries(byFile)
        .map(([name, d]) => ({ name, avgSec: Math.round(d.total / d.count), count: d.count }))
        .sort((a, b) => b.avgSec - a.avgSec)
        .slice(0, 10);

    const maxAvg = Math.max(...data.map(d => d.avgSec), 1);

    chartEl.innerHTML = `
        <div class="chart-summary">
            <span><strong>Overall average:</strong> ${formatDuration(Math.round(closedLogs.reduce((s, l) => s + l.viewDurationSeconds, 0) / closedLogs.length))}</span>
            <span><strong>Total sessions:</strong> ${closedLogs.length}</span>
        </div>
        <div class="chart-bars">
            ${data.map(d => `
                <div class="chart-bar-row">
                    <div class="chart-label" title="${escapeHtml(d.name)}">${truncate(d.name, 35)}</div>
                    <div class="chart-bar-wrap">
                        <div class="chart-bar" style="width: ${(d.avgSec / maxAvg) * 100}%"></div>
                        <span class="chart-value">${formatDuration(d.avgSec)}</span>
                    </div>
                    <div class="chart-count">${d.count} views</div>
                </div>
            `).join('')}
        </div>
    `;
}

function formatDuration(seconds) {
    if (seconds < 60) return seconds + 's';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
}

function truncate(str, len) {
    if (!str) return '';
    return str.length <= len ? str : str.slice(0, len - 3) + '...';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Render files list
function renderFilesList() {
    const filesList = document.getElementById('filesList');
    
    if (adminState.files.length === 0) {
        filesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"></div>
                <h3>No Files Uploaded Yet</h3>
                <p>Upload your first file using the form above</p>
            </div>
        `;
        return;
    }
    
    filesList.innerHTML = adminState.files.map(file => `
        <div class="file-card" data-category="${file.category}" data-status="${file.status}">
            <div class="file-header">
                <div>
                    <h3 class="file-title">${file.title}</h3>
                    <div class="file-meta">
                        <span>${file.category}</span>
                        <span>${new Date(file.publishDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <span class="file-badge ${file.status}">${file.status}</span>
            </div>
            
            <p class="file-info"><strong>File:</strong> ${file.fileName || file.title}</p>
            <p class="file-description">${file.description || ''}</p>
            
            <div class="file-stats">
                <span>${file.views} views</span>
                <span>${file.downloads} attempts</span>
            </div>
            
            <div class="file-actions">
                <button class="copy-link-btn" onclick="copyFileLink('${file.id}')" title="Copy shareable link">
                    Copy Link
                </button>
                <button class="preview-btn" onclick="previewFile('${file.id}')">
                    Preview
                </button>
                <button class="edit-btn" onclick="editFile('${file.id}')">
                    Edit
                </button>
                <button class="delete-btn" onclick="deleteFile('${file.id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Filter files
function filterFiles() {
    const categoryFilter = document.getElementById('filterCategory').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    const fileCards = document.querySelectorAll('.file-card');
    
    fileCards.forEach(card => {
        const category = card.dataset.category;
        const status = card.dataset.status;
        
        const categoryMatch = categoryFilter === 'all' || category === categoryFilter;
        const statusMatch = statusFilter === 'all' || status === statusFilter;
        
        if (categoryMatch && statusMatch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Edit file
function editFile(fileId) {
    const file = adminState.files.find(f => f.id === fileId);
    if (!file) return;
    
    document.getElementById('editFileId').value = file.id;
    document.getElementById('editTitle').value = file.title;
    document.getElementById('editCategory').value = file.category;
    document.getElementById('editDescription').value = file.description;
    document.getElementById('editStatus').value = file.status;
    document.getElementById('editAllowDownload').checked = file.allowDownload !== false;
    
    document.getElementById('editModal').style.display = 'block';
}

// Handle file edit
function handleFileEdit(e) {
    e.preventDefault();
    
    const fileId = document.getElementById('editFileId').value;
    const fileIndex = adminState.files.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) return;

    const updateFields = () => {
        adminState.files[fileIndex].title = document.getElementById('editTitle').value;
        adminState.files[fileIndex].category = document.getElementById('editCategory').value;
        adminState.files[fileIndex].description = document.getElementById('editDescription').value;
        adminState.files[fileIndex].status = document.getElementById('editStatus').value;
        adminState.files[fileIndex].allowDownload = document.getElementById('editAllowDownload').checked;

        saveAdminData();
        closeEditModal();
        showSuccessMessage('File updated successfully!');
        renderDashboard();

        logAdminActivity('file_edited', adminState.files[fileIndex].title);
    };

    const editFileInput = document.getElementById('editFileUpload');
    const newFile = editFileInput && editFileInput.files && editFileInput.files[0];

    if (newFile) {
        // validate
        const allowed = [
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'video/mp4', 'video/webm', 'video/ogg',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp'
        ];
        if (!allowed.includes(newFile.type)) {
            alert('Unsupported file type for replacement.');
            return;
        }
        const maxSize = 25 * 1024 * 1024;
        if (newFile.size > maxSize) {
            alert('Replacement file is too large (max 25MB).');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            const dataUrl = evt.target.result;
            adminState.files[fileIndex].fileName = newFile.name;
            adminState.files[fileIndex].fileType = newFile.type;
            adminState.files[fileIndex].fileData = dataUrl;
            updateFields();
        };
        reader.readAsDataURL(newFile);
    } else {
        updateFields();
    }
}

// Delete file
function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;

    const reason = prompt('Please provide a reason for deletion (optional):');

    const fileIndex = adminState.files.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
        const fileName = adminState.files[fileIndex].title;
        adminState.files.splice(fileIndex, 1);
        saveAdminData();
        showSuccessMessage('File deleted successfully!');
        renderDashboard();
        updateStatistics();

        logAdminActivity('file_deleted', fileName, reason);
    }
}

// Copy shareable file link
function copyFileLink(fileId) {
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'user.html');
    const link = `${baseUrl}?fileId=${encodeURIComponent(fileId)}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showSuccessMessage('Shareable link copied to clipboard!');
        }).catch(() => {
            fallbackCopyToClipboard(link);
        });
    } else {
        fallbackCopyToClipboard(link);
    }
}

function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showSuccessMessage('Shareable link copied to clipboard!');
    } catch (e) {
        alert('Link: ' + text);
    }
    document.body.removeChild(textarea);
}

// Preview file
function previewFile(fileId) {
    const file = adminState.files.find(f => f.id === fileId);
    if (!file) return;
    if (file.fileData) {
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;

        const ft = file.fileType || '';
        if (ft.includes('pdf')) {
            w.document.write(`<!DOCTYPE html><html><head><title>${file.title}</title></head><body style="margin:0">
                <embed src="${file.fileData}" type="application/pdf" width="100%" height="100%" />
            </body></html>`);
        } else if (ft.startsWith('image/')) {
            w.document.write(`<!DOCTYPE html><html><head><title>${file.title}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                <img src="${file.fileData}" alt="${file.title}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
            </body></html>`);
        } else if (ft.startsWith('video/')) {
            w.document.write(`<!DOCTYPE html><html><head><title>${file.title}</title></head><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                <video src="${file.fileData}" controls style="max-width:100%;max-height:100vh;"></video>
            </body></html>`);
        } else {
            w.document.write(`<!DOCTYPE html><html><head><title>${file.title}</title></head><body style="font-family:Arial,sans-serif;padding:30px">
                <h2>${file.title}</h2>
                <p>Preview not available for this document type. Download below:</p>
                <a id="downloadLink" href="#">Download ${file.fileName || 'file'}</a>
                <script>
                    document.getElementById('downloadLink').href='${file.fileData}';
                    document.getElementById('downloadLink').download='${file.fileName || file.title}';
                <\/script>
            </body></html>`);
        }
    } else if (file.content) {
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        if (!previewWindow) return;
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${file.title}</title>
            </head>
            <body>
                ${file.content}
            </body>
            </html>
        `);
    }

    logAdminActivity('file_previewed', file.title);
}

// Helper: convert dataURL to Blob (if needed elsewhere)
function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Render activity logs
function renderActivityLogs() {
    const adminBody = document.getElementById('adminLogsBody');
    const userBody = document.getElementById('userLogsBody');
    const sessionFilter = document.getElementById('sessionFilter');
    const sessionFilterValue = sessionFilter ? sessionFilter.value : 'all';

    if (adminState.activityLogs.length === 0) {
        const emptyRow = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 24px; color: #999;">
                    No activity logs yet
                </td>
            </tr>
        `;
        adminBody.innerHTML = emptyRow;
        userBody.innerHTML = emptyRow;
        return;
    }

    // Split logs into admin actions and user activities
    let recentLogs = adminState.activityLogs.slice(-200).reverse();
    if (sessionFilterValue && sessionFilterValue !== 'all') {
        recentLogs = recentLogs.filter(l => (l.sessionId || '').toString() === sessionFilterValue);
    }

    const adminLogs = recentLogs.filter(l => (l.userName && l.userName.toLowerCase() === 'admin') || (l.sessionId && l.sessionId === 'admin_session'));
    const userLogs = recentLogs.filter(l => !((l.userName && l.userName.toLowerCase() === 'admin') || (l.sessionId && l.sessionId === 'admin_session')));

    // Render admin logs
    if (adminLogs.length === 0) {
        adminBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 24px; color: #999;">No admin actions</td>
            </tr>
        `;
    } else {
        adminBody.innerHTML = adminLogs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.activity}</td>
                <td>${log.fileName || ''}</td>
                <td>${log.reason || ''}</td>
                <td>${log.sessionId || 'admin_session'}</td>
            </tr>
        `).join('');
    }

    // Render user logs: one row per login/session (Timestamp, User, Mobile, IP)
    // Click row to open session activity detail modal
    if (userLogs.length === 0) {
        userBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 24px; color: #999;">No user logins yet</td>
            </tr>
        `;
    } else {
        const sessionsMap = {};
        userLogs.forEach(log => {
            const sid = log.sessionId || 'no_session';
            if (!sessionsMap[sid]) sessionsMap[sid] = [];
            sessionsMap[sid].push(log);
        });

        let loginRows = Object.keys(sessionsMap)
            .filter(sid => sid && sid.startsWith('session_'))
            .map(sid => {
                const logs = sessionsMap[sid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const first = logs[0];
                return { sessionId: sid, loginTime: first.timestamp, userName: first.userName, mobile: first.mobile, clientIp: first.clientIp };
            })
            .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));

        if (sessionFilterValue && sessionFilterValue !== 'all') {
            loginRows = loginRows.filter(r => r.sessionId === sessionFilterValue);
        }

        userBody.innerHTML = loginRows.map(r => `
            <tr class="user-login-row" data-session-id="${(r.sessionId || '').replace(/"/g, '&quot;')}" onclick="showUserSessionDetail(this.dataset.sessionId)">
                <td>${new Date(r.loginTime).toLocaleString()}</td>
                <td>${(r.userName || 'Unknown').replace(/</g, '&lt;')}</td>
                <td>${(r.mobile || 'Unknown').replace(/</g, '&lt;')}</td>
                <td>${(r.clientIp || 'Unknown').replace(/</g, '&lt;')}</td>
            </tr>
        `).join('');
    }

    // Update session filter options
    populateSessionFilter();
}

// Activity label mapping for user-friendly display
function getActivityLabel(log) {
    const a = log.activity || '';
    const file = log.fileName || '';
    const extra = log.viewDurationSeconds !== undefined ? ` (${log.viewDurationSeconds}s)` : '';
    if (a === 'session_created' || a === 'otp_verified_success') return 'Logged in';
    if (a === 'session_restored') return 'Session restored (online)';
    if (a === 'file_viewed') return file ? `Opened file: ${file}` : 'Opened file';
    if (a === 'file_closed') return file ? `Closed file: ${file}${extra}` : `Closed file${extra}`;
    if (a === 'file_downloaded') return file ? `Downloaded: ${file}` : 'Downloaded file';
    if (a.includes('screenshot') || a === 'security_window_blur_detected') return 'Screenshot attempt';
    if (a === 'security_violation_session_ended') return 'Session ended (security violation)';
    if (a === 'user_logout') return 'Logged out';
    if (a === 'session_expired') return 'Session expired';
    if (a === 'otp_sent' || a === 'otp_resent') return 'OTP requested';
    if (a === 'otp_verification_failed') return 'OTP verification failed';
    if (a === 'security_right_click_blocked') return 'Right-click blocked';
    if (a === 'security_print_blocked') return 'Print blocked';
    if (a === 'security_save_blocked') return 'Save blocked';
    if (a === 'system_sleep_detected') return 'System sleep detected';
    if (a === 'session_extended') return 'Session extended';
    return a.replace(/_/g, ' ');
}

function showUserSessionDetail(sessionId) {
    if (!sessionId) return;
    const logs = adminState.activityLogs
        .filter(l => (l.sessionId || 'no_session') === sessionId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (logs.length === 0) return;

    const first = logs[0];
    document.getElementById('sessionDetailHeader').innerHTML = `
        <div class="session-detail-user">
            <strong>${(first.userName || 'Unknown').replace(/</g, '&lt;')}</strong> | 
            Mobile: ${(first.mobile || 'Unknown').replace(/</g, '&lt;')} | 
            IP: ${(first.clientIp || 'Unknown').replace(/</g, '&lt;')} | 
            Login: ${new Date(first.timestamp).toLocaleString()}
        </div>
    `;

    document.getElementById('sessionDetailList').innerHTML = logs.map(log => `
        <li>
            <span class="activity-time">${new Date(log.timestamp).toLocaleString()}</span>
            <span class="activity-label">${getActivityLabel(log).replace(/</g, '&lt;')}</span>
        </li>
    `).join('');

    document.getElementById('userSessionModal').style.display = 'block';
}

function closeUserSessionModal() {
    document.getElementById('userSessionModal').style.display = 'none';
}

// Populate session filter dropdown
function populateSessionFilter() {
    const sel = document.getElementById('sessionFilter');
    if (!sel) return;

    const seen = new Set();
    const options = [{ value: 'all', label: 'All Sessions' }];

    adminState.activityLogs.slice(-500).reverse().forEach(log => {
        const sid = log.sessionId || 'no_session';
        if (!seen.has(sid)) {
            seen.add(sid);
            options.push({ value: sid, label: sid });
        }
    });

    // preserve current value
    const current = sel.value || 'all';
    sel.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    if ([...sel.options].some(op => op.value === current)) sel.value = current;
}

// Update statistics
function updateStatistics() {
    adminState.statistics.totalFiles = adminState.files.filter(f => f.status === 'active').length;
    adminState.statistics.totalUsers = new Set(adminState.activityLogs.map(log => log.mobile)).size;
    adminState.statistics.totalViews = adminState.files.reduce((sum, file) => sum + file.views, 0);
    adminState.statistics.blockedAttempts = adminState.activityLogs.filter(log => 
        log.activity.includes('screenshot') || log.activity.includes('download')
    ).length;
    
    document.getElementById('totalFiles').textContent = adminState.statistics.totalFiles;
    document.getElementById('totalUsers').textContent = adminState.statistics.totalUsers;
    document.getElementById('totalViews').textContent = adminState.statistics.totalViews;
    document.getElementById('blockedAttempts').textContent = adminState.statistics.blockedAttempts;
}

// Export logs
function exportLogs() {
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Timestamp,User Name,Mobile Number,IP Address,File Accessed,Activity,Reason,Session ID\n" +
        adminState.activityLogs.map(log => 
            `"${new Date(log.timestamp).toLocaleString()}","${log.userName || 'N/A'}","${log.mobile || 'N/A'}","${log.clientIp || 'N/A'}","${log.fileName || 'N/A'}","${log.activity}","${(log.reason || '').replace(/"/g, '""')}","${log.sessionId || 'N/A'}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccessMessage('Activity logs exported successfully!');
}

// Log admin activity
function logAdminActivity(activity, fileName) {
    // optional third parameter 'reason' may be passed
    const reason = arguments.length > 2 ? arguments[2] : undefined;

    const activityLog = {
        timestamp: new Date().toISOString(),
        userName: 'Admin',
        mobile: 'N/A',
        fileName: fileName,
        activity: activity,
        reason: reason || '',
        sessionId: 'admin_session',
        userAgent: navigator.userAgent
    };
    
    adminState.activityLogs.push(activityLog);
    saveAdminData();
    renderActivityLogs();
}

// Clear all activity logs (admin action)
function clearAllLogs() {
    if (!confirm('Are you sure you want to permanently delete ALL activity logs? This cannot be undone.')) return;

    adminState.activityLogs = [];
    saveAdminData();
    renderActivityLogs();
    updateStatistics();
    showSuccessMessage('All activity logs have been cleared.');
}

// --- Clear Logs Modal and targeted clear implementation ---
function openClearLogsModal() {
    populateSessionFilter();
    // copy session options into clear modal select
    const src = document.getElementById('sessionFilter');
    const dest = document.getElementById('clearSessionSelect');
    if (src && dest) {
        dest.innerHTML = src.innerHTML;
    }

    document.getElementById('clearUserOptions').style.display = 'none';
    document.getElementById('clearReason').value = '';
    document.getElementById('clearLogsModal').style.display = 'block';

    // toggle user options when radio changes
    const radios = document.querySelectorAll('input[name="clearTarget"]');
    radios.forEach(r => r.addEventListener('change', function() {
        if (this.value === 'user') {
            document.getElementById('clearUserOptions').style.display = 'block';
        } else {
            document.getElementById('clearUserOptions').style.display = 'none';
        }
    }));

    // attach submit handler
    const form = document.getElementById('clearLogsForm');
    form.onsubmit = handleClearLogsSubmit;
}

function closeClearLogsModal() {
    document.getElementById('clearLogsModal').style.display = 'none';
}

function handleClearLogsSubmit(e) {
    e.preventDefault();
    const target = document.querySelector('input[name="clearTarget"]:checked').value;
    const reason = document.getElementById('clearReason').value.trim();
    if (!reason) {
        alert('Please provide a reason for clearing logs.');
        return;
    }

    // Build predicate for removal
    let predicate;
    if (target === 'all') {
        predicate = () => true;
    } else if (target === 'admin') {
        predicate = (log) => (log.userName && log.userName.toLowerCase() === 'admin') || (log.sessionId === 'admin_session');
    } else if (target === 'user') {
        const sess = document.getElementById('clearSessionSelect').value;
        const match = document.getElementById('clearUserMatch').value.trim().toLowerCase();

        predicate = (log) => {
            // user logs exclude admin/session admin_session
            if ((log.userName && log.userName.toLowerCase() === 'admin') || (log.sessionId === 'admin_session')) return false;
            if (sess && sess !== 'all' && (log.sessionId || '') !== sess) return false;
            if (match) {
                const uname = (log.userName || '').toString().toLowerCase();
                const mobile = (log.mobile || '').toString().toLowerCase();
                return uname.includes(match) || mobile.includes(match);
            }
            return true;
        };
    }

    // Find removed logs for reporting (before removal)
    const toRemove = adminState.activityLogs.filter(predicate);
    const removedCount = toRemove.length;

    // Remove logs
    adminState.activityLogs = adminState.activityLogs.filter(log => !predicate(log));
    saveAdminData();
    renderActivityLogs();
    updateStatistics();
    closeClearLogsModal();

    // Log the clear action as an admin activity and include reason + summary
    const summary = `${removedCount} logs cleared (${target}${target === 'user' ? ' filter' : ''})`;
    logAdminActivity('logs_cleared', summary, reason);
    showSuccessMessage(`Cleared ${removedCount} logs. Action recorded.`);
}

// Show success message
function showSuccessMessage(message) {
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successModal').style.display = 'block';
}

// Close success modal
function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Admin logout
function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'user.html';
    }
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Console helper
console.log('Dr. MCET College Admin Portal Loaded');
