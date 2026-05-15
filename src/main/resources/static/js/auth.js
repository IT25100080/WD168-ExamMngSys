/* ===========================
   auth.js – Shared auth utilities + login/register
   =========================== */

/* ---------- Session helpers ---------- */
function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
}

function getUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
}

function checkAuth(requiredRole) {
    const user = getUser();
    if (!user) { window.location.href = '/pages/login.html'; return null; }
    if (requiredRole && user.role !== requiredRole) { window.location.href = '/pages/login.html'; return null; }
    return user;
}

function populateSidebarUser() {
    const user = getUser();
    if (!user) return;
    const el = document.getElementById('sidebarUser');
    if (!el) return;
    const roleColors = { ADMIN: '#a78bfa', LECTURER: '#60a5fa', STUDENT: '#34d399' };
    el.innerHTML = `
        <strong>${user.fullName || user.username}</strong>
        <span class="role-badge" style="background:${roleColors[user.role] || '#94a3b8'}22;color:${roleColors[user.role] || '#94a3b8'}">${user.role}</span>`;

    {
        _injectChangePwdModal();
        if (!document.getElementById('changePwdBtn')) {
            const btn = document.createElement('button');
            btn.id = 'changePwdBtn';
            btn.className = 'btn-logout';
            btn.style.marginBottom = '8px';
            btn.textContent = 'Change Password';
            btn.onclick = showChangePasswordModal;
            const sidebarBottom = el.parentElement;
            sidebarBottom.insertBefore(btn, sidebarBottom.querySelector('.btn-logout'));
        }
    }

    if (user.passwordResetRequired) {
        showForceChangePwdModal(() => {});
    }

    if (user.role === 'STUDENT') loadNotifBadge();
}

async function loadNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const res = await apiFetch('/api/student/announcements/unread-count');
    if (!res || !res.ok) return;
    const { count } = await res.json();
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

function _injectChangePwdModal() {
    if (document.getElementById('changePwdModal')) return;
    const tpl = document.createElement('div');
    tpl.innerHTML = `
        <div class="modal-overlay hidden" id="changePwdModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Change Password</h3>
                    <button class="modal-close" onclick="closeModal('changePwdModal')"><i class="fas fa-xmark"></i></button>
                </div>
                <form id="changePwdForm" onsubmit="event.preventDefault();submitChangePassword()">
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Current Password <span style="color:red">*</span></label>
                            <input type="password" id="cpCurrentPwd" class="form-control" placeholder="Enter current password" required>
                        </div>
                        <div class="form-group">
                            <label>New Password <span style="color:red">*</span></label>
                            <input type="password" id="cpNewPwd" class="form-control" placeholder="Enter new password" required>
                        </div>
                        <div class="form-group">
                            <label>Confirm New Password <span style="color:red">*</span></label>
                            <input type="password" id="cpConfirmPwd" class="form-control" placeholder="Confirm new password" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('changePwdModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Change Password</button>
                    </div>
                </form>
            </div>
        </div>`;
    document.body.appendChild(tpl.firstElementChild);
}

function showChangePasswordModal() {
    document.getElementById('changePwdForm').reset();
    openModal('changePwdModal');
}

async function submitChangePassword() {
    const currentPassword = document.getElementById('cpCurrentPwd').value;
    const newPassword     = document.getElementById('cpNewPwd').value;
    const confirmPassword = document.getElementById('cpConfirmPwd').value;
    if (newPassword !== confirmPassword) { toast('New passwords do not match.', 'error'); return; }
    if (newPassword.length < 6) { toast('New password must be at least 6 characters.', 'error'); return; }
    const res = await apiFetch('/api/user/change-password', {
        method: 'PUT', body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res) return;
    if (res.ok) {
        closeModal('changePwdModal');
        toast('Password changed successfully.');
    } else {
        const d = await res.json();
        toast(d.error || 'Failed to change password.', 'error');
    }
}

async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
}

function redirectByRole(role) {
    const map = { ADMIN: '/pages/admin/dashboard.html', LECTURER: '/pages/lecturer/dashboard.html', STUDENT: '/pages/student/dashboard.html' };
    window.location.href = map[role] || '/pages/login.html';
}

/* ---------- API fetch wrapper ---------- */
async function apiFetch(url, options = {}) {
    const config = {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    };
    const res = await fetch(url, config);
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
        return null;
    }
    return res;
}

/* ---------- Toast ---------- */
function toast(msg, type = 'success') {
    let box = document.getElementById('toast');
    if (!box) { box = document.createElement('div'); box.id = 'toast'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = `toast-msg toast-${type}`;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

/* ---------- Modal helpers ---------- */
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

/* ---------- Grade helpers ---------- */
function getGrade(pct) {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 75) return 'A-';
    if (pct >= 70) return 'B+';
    if (pct >= 65) return 'B';
    if (pct >= 60) return 'B-';
    if (pct >= 55) return 'C+';
    if (pct >= 45) return 'C';
    if (pct >= 40) return 'C-';
    if (pct >= 35) return 'D+';
    if (pct >= 30) return 'D';
    return 'E';
}
function getGradeColor(pct) {
    if (pct >= 75) return '#16a34a';
    if (pct >= 60) return '#2563eb';
    if (pct >= 40) return '#d97706';
    if (pct >= 30) return '#ea580c';
    return '#dc2626';
}

/* ========================================
   FORCED PASSWORD CHANGE
   ======================================== */
function showForceChangePwdModal(afterChange) {
    _injectForceChangePwdModal();
    window._fcpAfterChange = afterChange;
    document.getElementById('forceChangePwdForm').reset();
    const alert = document.getElementById('fcpAlert');
    if (alert) alert.classList.add('hidden');
    openModal('forceChangePwdModal');
}

function _injectForceChangePwdModal() {
    if (document.getElementById('forceChangePwdModal')) return;
    const tpl = document.createElement('div');
    tpl.innerHTML = `
        <div class="modal-overlay" id="forceChangePwdModal" style="z-index:9999">
            <div class="modal">
                <div class="modal-header">
                    <h3>Set New Password</h3>
                </div>
                <form id="forceChangePwdForm" onsubmit="event.preventDefault();submitForceChangePassword()">
                    <div class="modal-body">
                        <p style="font-size:14px;color:#64748b;margin-bottom:16px">
                            Your account is using a temporary password. Please set a new password before continuing.
                        </p>
                        <div class="form-group">
                            <label>New Password <span style="color:red">*</span></label>
                            <input type="password" id="fcpNewPwd" class="form-control" placeholder="Enter new password" required>
                        </div>
                        <div class="form-group">
                            <label>Confirm New Password <span style="color:red">*</span></label>
                            <input type="password" id="fcpConfirmPwd" class="form-control" placeholder="Confirm new password" required>
                        </div>
                        <div id="fcpAlert" class="alert hidden" style="margin-top:12px"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Set New Password</button>
                    </div>
                </form>
            </div>
        </div>`;
    document.body.appendChild(tpl.firstElementChild);
}

async function submitForceChangePassword() {
    const newPassword     = document.getElementById('fcpNewPwd').value;
    const confirmPassword = document.getElementById('fcpConfirmPwd').value;
    if (newPassword !== confirmPassword) { _showFcpAlert('Passwords do not match.'); return; }
    if (newPassword.length < 6) { _showFcpAlert('Password must be at least 6 characters.'); return; }
    const res = await apiFetch('/api/user/force-change-password', {
        method: 'PUT', body: JSON.stringify({ newPassword })
    });
    if (!res) return;
    if (res.ok) {
        const u = getUser();
        if (u) { u.passwordResetRequired = false; localStorage.setItem('user', JSON.stringify(u)); }
        closeModal('forceChangePwdModal');
        if (window._fcpAfterChange) window._fcpAfterChange();
    } else {
        const d = await res.json();
        _showFcpAlert(d.error || 'Failed to change password.');
    }
}

function _showFcpAlert(msg) {
    const el = document.getElementById('fcpAlert');
    if (!el) return;
    el.className = 'alert alert-error';
    el.textContent = msg;
    el.classList.remove('hidden');
}

/* ========================================
   LOGIN PAGE – only active on login.html
   ======================================== */
(function initLoginPage() {
    if (!document.getElementById('loginForm')) return;

    const user = getUser();
    if (user) { redirectByRole(user.role); return; }

    window.showTab = function(tab) {
        document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
        document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
        document.querySelectorAll('.login-tab').forEach((t, i) =>
            t.classList.toggle('active', (i === 0) === (tab === 'login')));
        clearLoginAlert();
    };

    window.login = async function() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!username || !password) { showLoginAlert('Please enter username and password.', 'error'); return; }
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('user', JSON.stringify(data));
                if (data.passwordResetRequired) {
                    showForceChangePwdModal(() => redirectByRole(data.role));
                } else {
                    redirectByRole(data.role);
                }
            } else {
                let msg = 'Incorrect username or password.';
                try { const d = await res.json(); msg = d.error || d.message || msg; } catch (_) {}
                showLoginAlert(msg, 'error');
            }
        } catch (e) { showLoginAlert('Connection error. Please try again.', 'error'); }
    };

    window.register = async function() {
        const fullName = document.getElementById('regFullName').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const email    = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        if (!username || !email || !password) { showLoginAlert('All fields are required.', 'error'); return; }
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, username, email, password })
            });
            const data = await res.json();
            if (res.ok) {
                showLoginAlert('Account created! Please sign in.', 'success');
                showTab('login');
                document.getElementById('loginUsername').value = username;
            } else { showLoginAlert(data.error || 'Registration failed.', 'error'); }
        } catch (e) { showLoginAlert('Connection error. Please try again.', 'error'); }
    };

    function showLoginAlert(msg, type) {
        const el = document.getElementById('loginAlert');
        if (!el) return;
        el.className = `alert alert-${type}`;
        el.textContent = msg;
        el.classList.remove('hidden');
    }
    function clearLoginAlert() {
        const el = document.getElementById('loginAlert');
        if (el) el.classList.add('hidden');
    }

    window.showForgotModal = function() {
        document.getElementById('forgotIdentifier').value = '';
        const alert = document.getElementById('forgotAlert');
        if (alert) { alert.classList.add('hidden'); alert.textContent = ''; }
        openModal('forgotModal');
    };

    window.submitForgotPassword = async function() {
        const identifier = document.getElementById('forgotIdentifier').value.trim();
        if (!identifier) { showForgotAlert('Please enter your username or email.', 'error'); return; }
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier })
            });
            const data = await res.json();
            if (res.ok) {
                showForgotAlert(data.message, 'success');
                document.getElementById('forgotIdentifier').disabled = true;
            } else {
                showForgotAlert(data.error || 'Failed to submit request.', 'error');
            }
        } catch (e) { showForgotAlert('Connection error. Please try again.', 'error'); }
    };

    function showForgotAlert(msg, type) {
        const el = document.getElementById('forgotAlert');
        if (!el) return;
        el.className = `alert alert-${type}`;
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const loginHidden = document.getElementById('loginForm').classList.contains('hidden');
        loginHidden ? window.register() : window.login();
    });
})();
