/* ===========================
   auth.js – Shared auth utilities + login/register
   =========================== */

/* ---------- Session helpers ---------- */
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
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data));
                redirectByRole(data.role);
            } else {
                showLoginAlert(data.error || data.message || 'Invalid credentials.', 'error');
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
