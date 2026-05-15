/* ===========================
   admin.js – Admin module
   =========================== */
const user = checkAuth('ADMIN');
if (user) populateSidebarUser();

/* ============================================================
   DASHBOARD
   ============================================================ */
async function initDashboard() {
    const [usersRes] = await Promise.all([
        apiFetch('/api/admin/users')
    ]);
    if (!usersRes) return;
    const users = await usersRes.json();

    const admins    = users.filter(u => u.role === 'ADMIN').length;
    const lecturers = users.filter(u => u.role === 'LECTURER').length;
    const students  = users.filter(u => u.role === 'STUDENT').length;

    setText('statTotal',    users.length);
    setText('statAdmin',    admins);
    setText('statLecturer', lecturers);
    setText('statStudent',  students);

    // Recent users table
    const tbody = document.getElementById('recentUsersTbody');
    if (tbody) {
        tbody.innerHTML = users.slice(0, 8).map(u => `
            <tr>
                <td>${esc(u.fullName || '—')}</td>
                <td>${esc(u.username)}</td>
                <td>${esc(u.email)}</td>
                <td><span class="badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
            </tr>`).join('');
    }

}

/* ============================================================
   ACADEMIC YEARS
   ============================================================ */
let years = [];

async function initYears() {
    await loadYears();
}

async function loadYears() {
    setLoading('yearsTbody');
    const res = await apiFetch('/api/admin/years');
    if (!res) return;
    years = await res.json();
    renderYears();
}

function renderYears() {
    const tbody = document.getElementById('yearsTbody');
    if (!tbody) return;
    if (!years.length) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted" style="padding:32px">No academic years found.</td></tr>`;
        return;
    }
    tbody.innerHTML = years.map(y => `
        <tr>
            <td>${esc(y.name)}</td>
            <td>${y.displayOrder}</td>
        </tr>`).join('');
}

/* ============================================================
   SEMESTERS
   ============================================================ */
let currentYearId = null;
let semesters = [];

async function initSemesters() {
    const res = await apiFetch('/api/admin/years');
    if (!res) return;
    years = await res.json();
    const sel = document.getElementById('yearSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Year --</option>' +
        years.map(y => `<option value="${y.id}">${esc(y.name)}</option>`).join('');
}

async function onYearChange() {
    const sel = document.getElementById('yearSelect');
    currentYearId = sel.value || null;
    if (currentYearId) await loadSemesters(currentYearId);
    else renderSemesters([]);
}

async function loadSemesters(yearId) {
    setLoading('semestersTbody');
    const res = await apiFetch(`/api/admin/years/${yearId}/semesters`);
    if (!res) return;
    semesters = await res.json();
    renderSemesters(semesters);
}

function renderSemesters(list) {
    const tbody = document.getElementById('semestersTbody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted" style="padding:32px">${currentYearId ? 'No semesters found.' : 'Select a year first.'}</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(s => `
        <tr>
            <td>${esc(s.name)}</td>
            <td>${s.displayOrder}</td>
        </tr>`).join('');
}

/* ============================================================
   MODULES
   ============================================================ */
let currentSemId = null;
let modules = [];
let lecturerList = [];

async function initModules() {
    const [yRes, uRes] = await Promise.all([
        apiFetch('/api/admin/years'),
        apiFetch('/api/admin/users')
    ]);
    if (!yRes || !uRes) return;
    years = await yRes.json();
    const allUsers = await uRes.json();
    lecturerList = allUsers.filter(u => u.role === 'LECTURER');

    const sel = document.getElementById('modYearSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Year --</option>' +
        years.map(y => `<option value="${y.id}">${esc(y.name)}</option>`).join('');
}

async function onModYearChange() {
    const yearId = document.getElementById('modYearSelect').value;
    currentSemId = null;
    const semSel = document.getElementById('modSemSelect');
    semSel.innerHTML = '<option value="">-- Select Semester --</option>';
    renderModules([]);
    if (!yearId) return;
    const res = await apiFetch(`/api/admin/years/${yearId}/semesters`);
    if (!res) return;
    const sems = await res.json();
    semSel.innerHTML = '<option value="">-- Select Semester --</option>' +
        sems.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
}

async function onModSemChange() {
    currentSemId = document.getElementById('modSemSelect').value || null;
    if (currentSemId) await loadModules(currentSemId);
    else renderModules([]);
}

async function loadModules(semId) {
    setLoading('modulesTbody');
    const res = await apiFetch(`/api/admin/semesters/${semId}/modules`);
    if (!res) return;
    modules = await res.json();
    renderModules(modules);
}

function renderModules(list) {
    const tbody = document.getElementById('modulesTbody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:32px">${currentSemId ? 'No modules yet.' : 'Select a semester first.'}</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(m => {
        const lecturerNames = m.lecturers && m.lecturers.length
            ? m.lecturers.map(l => esc(l.fullName || l.username)).join(', ')
            : '<span class="text-muted">Unassigned</span>';
        const hasLecturers = m.lecturers && m.lecturers.length > 0;
        return `
        <tr>
            <td><strong>${esc(m.moduleCode)}</strong></td>
            <td>${esc(m.name)}</td>
            <td>${lecturerNames}</td>
            <td><code style="font-size:12px;background:#f1f5f9;padding:2px 8px;border-radius:4px">${esc(m.enrollmentKey)}</code></td>
            <td><div class="actions-cell">
                <button class="btn btn-sm btn-info" onclick="showAssignModal(${m.id})">Assign Lecturer</button>
                ${hasLecturers ? `<button class="btn btn-sm btn-warning" onclick="showRemoveLecturerModal(${m.id})">Remove Lecturer</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteModule(${m.id})">Delete</button>
            </div></td>
        </tr>`;
    }).join('');
}

function showCreateModuleModal() {
    if (!currentSemId) { toast('Select a semester first.', 'error'); return; }
    openModal('moduleModal');
    document.getElementById('moduleForm').reset();
}

async function saveModule() {
    const name = document.getElementById('modName').value.trim();
    const moduleCode = document.getElementById('modCode').value.trim();
    const description = document.getElementById('modDesc').value.trim();
    const enrollmentKey = document.getElementById('modKey').value.trim();
    if (!name || !moduleCode || !enrollmentKey) { toast('Name, code, and enrollment key are required.', 'error'); return; }
    const res = await apiFetch('/api/admin/modules', {
        method: 'POST',
        body: JSON.stringify({ semesterId: currentSemId, name, moduleCode, description, enrollmentKey })
    });
    if (!res) return;
    if (res.ok) { closeModal('moduleModal'); toast('Module created.'); await loadModules(currentSemId); }
    else { const d = await res.json(); toast(d.message || 'Failed.', 'error'); }
}

let assigningModuleId = null;
function showAssignModal(moduleId) {
    assigningModuleId = moduleId;
    const sel = document.getElementById('lecturerSelect');
    sel.innerHTML = '<option value="">-- Select Lecturer --</option>' +
        lecturerList.map(l => `<option value="${l.id}">${esc(l.fullName || l.username)} (${esc(l.email)})</option>`).join('');
    openModal('assignModal');
}

async function assignLecturer() {
    const lecturerId = document.getElementById('lecturerSelect').value;
    if (!lecturerId) { toast('Select a lecturer.', 'error'); return; }
    const res = await apiFetch(`/api/admin/modules/${assigningModuleId}/assign-lecturer`, {
        method: 'PUT', body: JSON.stringify({ lecturerId })
    });
    if (!res) return;
    if (res.ok) { closeModal('assignModal'); toast('Lecturer assigned.'); await loadModules(currentSemId); }
    else toast('Failed to assign.', 'error');
}

let removingModuleId = null;

function showRemoveLecturerModal(moduleId) {
    removingModuleId = moduleId;
    const module = modules.find(m => m.id === moduleId);
    const list = document.getElementById('removeLecturerList');
    list.innerHTML = module.lecturers.map(l => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0">
            <span>${esc(l.fullName || l.username)} <small class="text-muted">(${esc(l.email || '')})</small></span>
            <button class="btn btn-sm btn-danger" onclick="removeLecturer(${moduleId}, ${l.id})">Remove</button>
        </div>`).join('');
    openModal('removeLecturerModal');
}

async function removeLecturer(moduleId, lecturerId) {
    const res = await apiFetch(`/api/admin/modules/${moduleId}/remove-lecturer`, {
        method: 'PUT', body: JSON.stringify({ lecturerId })
    });
    if (res && res.ok) {
        closeModal('removeLecturerModal');
        toast('Lecturer removed.');
        await loadModules(currentSemId);
    } else toast('Failed to remove lecturer.', 'error');
}

async function deleteModule(id) {
    if (!confirm('Delete this module?')) return;
    const res = await apiFetch(`/api/admin/modules/${id}`, { method: 'DELETE' });
    if (res && res.ok) { toast('Module deleted.'); await loadModules(currentSemId); }
    else toast('Failed.', 'error');
}

/* ============================================================
   USERS
   ============================================================ */
let allUsers = [];

async function initUsers() {
    await loadUsers();
}

async function loadUsers() {
    setLoading('usersTbody');
    const res = await apiFetch('/api/admin/users');
    if (!res) return;
    allUsers = await res.json();
    renderUsers(allUsers);
}

function renderUsers(list) {
    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:32px">No users found.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(u => `
        <tr>
            <td>${esc(u.fullName || '—')}</td>
            <td>${esc(u.username)}</td>
            <td>${esc(u.email)}</td>
            <td><span class="badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
            <td><div class="actions-cell">
                ${u.role === 'STUDENT' ? `<button class="btn btn-sm btn-info" onclick="showEnrollmentsModal(${u.id}, '${esc(u.fullName || u.username)}')">Enrollments</button>` : ''}
                ${u.role !== 'ADMIN' ? `<button class="btn btn-sm btn-warning" onclick="showResetPasswordModal(${u.id}, '${esc(u.fullName || u.username)}')">Reset Password</button>` : ''}
                ${u.id !== user.id ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Delete</button>` : '<span class="text-muted">You</span>'}
            </div></td>
        </tr>`).join('');
}

function filterUsers() {
    const q = document.getElementById('userSearch').value.toLowerCase();
    const r = document.getElementById('roleFilter').value;
    renderUsers(allUsers.filter(u =>
        (!r || u.role === r) &&
        (!q || u.username.toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    ));
}

function showCreateUserModal() { openModal('userModal'); document.getElementById('userForm').reset(); }

async function saveUser() {
    const fullName = document.getElementById('uFullName').value.trim();
    const username = document.getElementById('uUsername').value.trim();
    const email    = document.getElementById('uEmail').value.trim();
    const password = document.getElementById('uPassword').value;
    const role     = document.getElementById('uRole').value;
    if (!username || !email || !password || !role) { toast('All fields are required.', 'error'); return; }
    const res = await apiFetch('/api/admin/users', {
        method: 'POST', body: JSON.stringify({ fullName, username, email, password, role })
    });
    if (!res) return;
    if (res.ok) { closeModal('userModal'); toast('User created.'); await loadUsers(); }
    else { const d = await res.json(); toast(d.message || d.error || 'Failed.', 'error'); }
}

async function deleteUser(id) {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res && res.ok) { toast('User deleted.'); await loadUsers(); }
    else toast('Failed to delete.', 'error');
}

let resetPasswordUserId = null;

function showResetPasswordModal(userId, username) {
    resetPasswordUserId = userId;
    document.getElementById('resetPwdUsername').textContent = username;
    document.getElementById('resetPwdForm').reset();
    openModal('resetPwdModal');
}

async function doResetPassword() {
    const newPassword = document.getElementById('rpNewPassword').value;
    const confirmPassword = document.getElementById('rpConfirmPassword').value;
    if (!newPassword) { toast('New password is required.', 'error'); return; }
    if (newPassword !== confirmPassword) { toast('Passwords do not match.', 'error'); return; }
    if (newPassword.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    const res = await apiFetch(`/api/admin/users/${resetPasswordUserId}/reset-password`, {
        method: 'PUT', body: JSON.stringify({ newPassword })
    });
    if (!res) return;
    if (res.ok) {
        closeModal('resetPwdModal');
        toast('Password reset successfully.');
    } else { const d = await res.json(); toast(d.error || d.message || 'Failed to reset password.', 'error'); }
}

let enrollmentsStudentId = null;

async function showEnrollmentsModal(studentId, studentName) {
    enrollmentsStudentId = studentId;
    document.getElementById('enrollmentsStudentName').textContent = studentName;
    document.getElementById('enrollmentsList').innerHTML = '<div class="loading">Loading enrollments…</div>';
    openModal('enrollmentsModal');

    const res = await apiFetch(`/api/admin/students/${studentId}/enrollments`);
    if (!res) return;
    const enrollments = await res.json();

    const list = document.getElementById('enrollmentsList');
    if (!enrollments.length) {
        list.innerHTML = '<p class="text-muted text-center" style="padding:24px">This student is not enrolled in any modules.</p>';
        return;
    }
    list.innerHTML = `
        <table style="width:100%">
            <thead>
                <tr>
                    <th style="padding:10px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;text-align:left">Code</th>
                    <th style="padding:10px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;text-align:left">Module</th>
                    <th style="padding:10px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;text-align:left">Year</th>
                    <th style="padding:10px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;text-align:left">Semester</th>
                    <th style="padding:10px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;text-align:left">Enrolled</th>
                    <th style="padding:10px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0"></th>
                </tr>
            </thead>
            <tbody>
                ${enrollments.map(e => `
                <tr id="enroll-row-${e.module.id}">
                    <td style="padding:12px;border-bottom:1px solid #f1f5f9"><strong>${esc(e.module.moduleCode)}</strong></td>
                    <td style="padding:12px;border-bottom:1px solid #f1f5f9">${esc(e.module.name)}</td>
                    <td style="padding:12px;border-bottom:1px solid #f1f5f9">${esc(e.module.semester?.academicYear?.name || '—')}</td>
                    <td style="padding:12px;border-bottom:1px solid #f1f5f9">${esc(e.module.semester?.name || '—')}</td>
                    <td style="padding:12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b">${e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : '—'}</td>
                    <td style="padding:12px;border-bottom:1px solid #f1f5f9">
                        <button class="btn btn-sm btn-danger" onclick="unenrollStudent(${studentId}, ${e.module.id})">Unenroll</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

async function unenrollStudent(studentId, moduleId) {
    if (!confirm('Remove this student from the module?')) return;
    const res = await apiFetch(`/api/admin/students/${studentId}/enrollments/${moduleId}`, { method: 'DELETE' });
    if (res && res.ok) {
        toast('Student unenrolled.');
        const row = document.getElementById(`enroll-row-${moduleId}`);
        if (row) row.remove();
        if (!document.querySelector('#enrollmentsList tbody tr')) {
            document.getElementById('enrollmentsList').innerHTML =
                '<p class="text-muted text-center" style="padding:24px">This student is not enrolled in any modules.</p>';
        }
    } else toast('Failed to unenroll.', 'error');
}

/* ============================================================
   ANNOUNCEMENTS
   ============================================================ */
let adminAllModules = [];

async function initAdminAnnouncements() {
    await Promise.all([loadAdminAnnouncementsTable(), loadAdminModuleList()]);
}

async function loadAdminAnnouncementsTable() {
    setLoading('adminAnnouncementsTbody');
    const res = await apiFetch('/api/admin/announcements');
    if (!res) return;
    const list = await res.json();
    const tbody = document.getElementById('adminAnnouncementsTbody');
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(a => `
        <tr>
            <td>${a.module ? `<span class="badge badge-draft">${esc(a.module.name)}</span>` : '<span class="badge badge-active">Global</span>'}</td>
            <td><strong>${esc(a.title)}</strong></td>
            <td style="max-width:220px;white-space:normal">${esc(a.message)}</td>
            <td>${esc(a.postedBy?.fullName || a.postedBy?.username || '—')}</td>
            <td class="text-muted">${formatDate(a.createdAt)}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteAdminAnnouncement(${a.id})"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('')
        : `<tr><td colspan="6" class="text-center text-muted" style="padding:32px">No announcements yet.</td></tr>`;
}

async function loadAdminModuleList() {
    const res = await apiFetch('/api/admin/years');
    if (!res) return;
    const years = await res.json();
    const semResults = await Promise.all(
        years.map(y => apiFetch(`/api/admin/years/${y.id}/semesters`).then(r => r ? r.json() : []))
    );
    const sems = semResults.flat();
    const modResults = await Promise.all(
        sems.map(s => apiFetch(`/api/admin/semesters/${s.id}/modules`).then(r => r ? r.json() : []))
    );
    adminAllModules = modResults.flat();
    const sel = document.getElementById('adminAnnouncementModuleSel');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Module --</option>' +
        adminAllModules.map(m => `<option value="${m.id}">${esc(m.moduleCode)} – ${esc(m.name)}</option>`).join('');
}

function openAdminAnnouncementModal() {
    document.getElementById('adminAnnouncementScope').value = 'GLOBAL';
    document.getElementById('adminModuleGroup').style.display = 'none';
    document.getElementById('adminAnnouncementTitle').value = '';
    document.getElementById('adminAnnouncementMessage').value = '';
    document.getElementById('adminAnnouncementError').classList.add('hidden');
    openModal('adminAnnouncementModal');
}

function toggleModuleSelect() {
    const scope = document.getElementById('adminAnnouncementScope').value;
    document.getElementById('adminModuleGroup').style.display = scope === 'MODULE' ? '' : 'none';
}

async function submitAdminAnnouncement() {
    const scope    = document.getElementById('adminAnnouncementScope').value;
    const moduleId = scope === 'MODULE' ? document.getElementById('adminAnnouncementModuleSel').value : null;
    const title    = document.getElementById('adminAnnouncementTitle').value.trim();
    const message  = document.getElementById('adminAnnouncementMessage').value.trim();
    const errEl    = document.getElementById('adminAnnouncementError');
    if (scope === 'MODULE' && !moduleId) { errEl.textContent = 'Select a module.'; errEl.classList.remove('hidden'); return; }
    if (!title)   { errEl.textContent = 'Enter a title.';   errEl.classList.remove('hidden'); return; }
    if (!message) { errEl.textContent = 'Enter a message.'; errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');
    const res = await apiFetch('/api/admin/announcements', {
        method: 'POST', body: JSON.stringify({ moduleId: moduleId || null, title, message })
    });
    if (res && res.ok) {
        closeModal('adminAnnouncementModal');
        toast('Announcement posted.');
        await loadAdminAnnouncementsTable();
    } else {
        errEl.textContent = 'Failed to post announcement.';
        errEl.classList.remove('hidden');
    }
}

async function deleteAdminAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    const res = await apiFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
    if (res && res.ok) { toast('Announcement deleted.'); await loadAdminAnnouncementsTable(); }
    else toast('Failed to delete.', 'error');
}

function formatDate(dt) { return dt ? new Date(dt).toLocaleString() : '—'; }

/* ============================================================
   Helpers
   ============================================================ */
function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setLoading(tbodyId) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="99"><div class="loading">Loading...</div></td></tr>`;
}
