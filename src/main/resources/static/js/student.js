/* ===========================
   student.js – Student module
   =========================== */
const user = checkAuth('STUDENT');
if (user) populateSidebarUser();

/* ============================================================
   DASHBOARD
   ============================================================ */
async function initDashboard() {
    const [modRes, resRes] = await Promise.all([
        apiFetch('/api/student/modules/enrolled'),
        apiFetch('/api/student/results')
    ]);
    if (!modRes || !resRes) return;
    const mods    = await modRes.json();
    const results = await resRes.json();

    setText('statEnrolled', mods.length);
    setText('statResults',  results.length);

    const tbody = document.getElementById('enrolledTbody');
    if (tbody) {
        tbody.innerHTML = mods.length ? mods.map(m => `
            <tr>
                <td><strong>${esc(m.moduleCode)}</strong></td>
                <td>${esc(m.name)}</td>
                <td>${esc(m.lecturer ? (m.lecturer.fullName || m.lecturer.username) : '—')}</td>
                <td><a class="btn btn-sm btn-primary" href="/pages/student/exams.html?moduleId=${m.id}">View Exams</a></td>
            </tr>`).join('')
            : `<tr><td colspan="4" class="text-center text-muted" style="padding:32px">You have not enrolled in any modules yet.</td></tr>`;
    }
}

/* ============================================================
   MODULES – Browse & Enroll
   ============================================================ */
let browseYears = [];
let browseSelectedYearId = null;
let browseSelectedSemId  = null;
let enrollingModuleId    = null;

async function initModules() {
    await Promise.all([loadBrowseYears(), loadEnrolledModules()]);
}

async function loadBrowseYears() {
    const res = await apiFetch('/api/student/years');
    if (!res) return;
    browseYears = await res.json();
    const cont = document.getElementById('yearsContainer');
    if (!cont) return;
    cont.innerHTML = browseYears.map(y => `
        <button class="btn btn-secondary" onclick="selectYear(${y.id}, this)">${esc(y.name)}</button>
    `).join('');
}

async function selectYear(yearId, btn) {
    browseSelectedYearId = yearId;
    browseSelectedSemId  = null;
    document.querySelectorAll('#yearsContainer .btn').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');

    document.getElementById('semestersRow').classList.remove('hidden');
    document.getElementById('modulesSection').classList.add('hidden');

    const res = await apiFetch(`/api/student/years/${yearId}/semesters`);
    if (!res) return;
    const sems = await res.json();
    const cont = document.getElementById('semestersContainer');
    cont.innerHTML = sems.map(s => `
        <button class="btn btn-secondary" onclick="selectSemester(${s.id}, this)">${esc(s.name)}</button>
    `).join('');
}

async function selectSemester(semId, btn) {
    browseSelectedSemId = semId;
    document.querySelectorAll('#semestersContainer .btn').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');

    document.getElementById('modulesSection').classList.remove('hidden');
    const res = await apiFetch(`/api/student/semesters/${semId}/modules`);
    if (!res) return;
    const modules = await res.json();
    renderBrowseModules(modules);
}

function renderBrowseModules(list) {
    const tbody = document.getElementById('browseModulesTbody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding:32px">No modules in this semester.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(m => `
        <tr>
            <td><strong>${esc(m.moduleCode)}</strong></td>
            <td>${esc(m.name)}</td>
            <td>${esc(m.lecturer ? (m.lecturer.fullName || m.lecturer.username) : '—')}</td>
            <td><button class="btn btn-sm btn-primary" onclick="showEnrollModal(${m.id})">Enroll</button></td>
        </tr>`).join('');
}

async function loadEnrolledModules() {
    const res = await apiFetch('/api/student/modules/enrolled');
    if (!res) return;
    const mods = await res.json();
    const tbody = document.getElementById('enrolledModulesTbody');
    if (!tbody) return;
    tbody.innerHTML = mods.length ? mods.map(m => `
        <tr>
            <td><strong>${esc(m.moduleCode)}</strong></td>
            <td>${esc(m.name)}</td>
            <td>${esc(m.lecturer ? (m.lecturer.fullName || m.lecturer.username) : '—')}</td>
            <td><a class="btn btn-sm btn-info" href="/pages/student/exams.html?moduleId=${m.id}">View Exams</a></td>
        </tr>`).join('')
        : `<tr><td colspan="4" class="text-center text-muted" style="padding:32px">No enrollments yet.</td></tr>`;
}

function showEnrollModal(moduleId) {
    enrollingModuleId = moduleId;
    document.getElementById('enrollKey').value = '';
    document.getElementById('enrollError').classList.add('hidden');
    openModal('enrollModal');
    setTimeout(() => document.getElementById('enrollKey').focus(), 100);
}

async function submitEnroll() {
    const key = document.getElementById('enrollKey').value.trim();
    if (!key) { showEnrollError('Enter the enrollment key.'); return; }
    const res = await apiFetch(`/api/student/modules/${enrollingModuleId}/enroll`, {
        method: 'POST', body: JSON.stringify({ enrollmentKey: key })
    });
    if (!res) return;
    if (res.ok) {
        closeModal('enrollModal');
        toast('Successfully enrolled!');
        await loadEnrolledModules();
    } else {
        const d = await res.json();
        showEnrollError(d.message || 'Invalid enrollment key.');
    }
}

function showEnrollError(msg) {
    const el = document.getElementById('enrollError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

/* ============================================================
   EXAMS – View & Access
   ============================================================ */
let enrolledMods = [];
let examList = [];
let examModuleId = null;
let accessingExamId = null;

async function initExams() {
    const params = new URLSearchParams(location.search);
    examModuleId = params.get('moduleId');

    const res = await apiFetch('/api/student/modules/enrolled');
    if (!res) return;
    enrolledMods = await res.json();

    const sel = document.getElementById('moduleSelector');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- All Enrolled Modules --</option>' +
        enrolledMods.map(m => `<option value="${m.id}"${m.id == examModuleId ? ' selected' : ''}>${esc(m.moduleCode)} – ${esc(m.name)}</option>`).join('');

    if (examModuleId) await loadExams(examModuleId);
    else await loadAllExams();
}

async function loadAllExams() {
    const results = await Promise.all(enrolledMods.map(m =>
        apiFetch(`/api/student/modules/${m.id}/exams`).then(r => r ? r.json() : [])
    ));
    examList = results.flat();
    renderExams(examList);
}

async function onModuleChange() {
    examModuleId = document.getElementById('moduleSelector').value;
    if (examModuleId) await loadExams(examModuleId);
    else await loadAllExams();
}

async function loadExams(moduleId) {
    setLoading('examsTbody');
    const res = await apiFetch(`/api/student/modules/${moduleId}/exams`);
    if (!res) return;
    examList = await res.json();
    renderExams(examList);
}

function renderExams(list) {
    const tbody = document.getElementById('examsTbody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:40px">No exams available.</td></tr>`;
        return;
    }
    const now = new Date();
    tbody.innerHTML = list.map(e => {
        const isOpen = e.status === 'ACTIVE' && (!e.startTime || new Date(e.startTime) <= now) && (!e.endTime || new Date(e.endTime) >= now);
        return `
        <tr>
            <td><strong>${esc(e.title)}</strong></td>
            <td>${esc(e.module ? e.module.name : '—')}</td>
            <td>${e.durationMinutes} min</td>
            <td>${e.maxAttempts || 1}</td>
            <td><span class="badge badge-${e.status.toLowerCase()}">${e.status}</span></td>
            <td>${e.startTime ? formatDate(e.startTime) : '—'}</td>
            <td>
                ${isOpen
                    ? `<button class="btn btn-sm btn-primary" onclick="showAccessModal(${e.id})">Enter Exam</button>`
                    : `<span class="text-muted">${e.status === 'CLOSED' ? 'Closed' : 'Not available'}</span>`}
            </td>
        </tr>`;
    }).join('');
}

function showAccessModal(examId) {
    accessingExamId = examId;
    document.getElementById('examPassword').value = '';
    document.getElementById('accessError').classList.add('hidden');
    openModal('accessModal');
    setTimeout(() => document.getElementById('examPassword').focus(), 100);
}

async function submitAccess() {
    const password = document.getElementById('examPassword').value;
    if (!password) { showAccessError('Enter the exam password.'); return; }
    const res = await fetch(`/api/student/exams/${accessingExamId}/access`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    if (res.ok) {
        const attempt = await res.json();
        sessionStorage.setItem('attemptId', attempt.id);
        sessionStorage.setItem('examId', accessingExamId);
        window.location.href = '/pages/student/quiz.html';
    } else if (res.status === 401) {
        window.location.href = '/pages/login.html';
    } else {
        const d = await res.json().catch(() => ({}));
        showAccessError(d.message || 'Unable to access exam. Please try again.');
    }
}

function showAccessError(msg) {
    const el = document.getElementById('accessError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

/* ============================================================
   RESULTS
   ============================================================ */
async function initResults() {
    setLoading('resultsTbody');
    const res = await apiFetch('/api/student/results');
    if (!res) return;
    const results = await res.json();
    const tbody = document.getElementById('resultsTbody');
    if (!tbody) return;
    if (!results.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:40px">No results released yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = results.map(a => {
        const total = (a.autoScore || 0) + (a.manualScore || 0);
        const pct   = a.maxScore ? Math.round(total / a.maxScore * 100) : 0;
        const grade = pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
        const gradeColor = pct >= 60 ? '#16a34a' : '#dc2626';
        return `
        <tr>
            <td><strong>${esc(a.exam?.title || '—')}</strong></td>
            <td>${esc(a.exam?.module?.name || '—')}</td>
            <td>${total} / ${a.maxScore || 0}</td>
            <td>${pct}%</td>
            <td style="font-weight:800;color:${gradeColor}">${grade}</td>
            <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
        </tr>`;
    }).join('');
}

/* ============================================================
   Helpers
   ============================================================ */
function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setLoading(tbodyId) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="10"><div class="loading">Loading...</div></td></tr>`;
}
function formatDate(dt) { return dt ? new Date(dt).toLocaleString() : '—'; }
