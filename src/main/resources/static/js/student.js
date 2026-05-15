/* ===========================
   student.js – Student module
   =========================== */
const user = checkAuth('STUDENT');
if (user) populateSidebarUser();

/* ============================================================
   DASHBOARD
   ============================================================ */
async function initDashboard() {
    const u = getUser();
    setText('greetingHeading', `${getTimeGreeting()}, ${u?.fullName || u?.username || ''}!`);

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
let enrolledModuleIds    = new Set();
let currentBrowseModules = [];

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
    currentBrowseModules = list;
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
            <td>${enrolledModuleIds.has(m.id)
                ? `<span class="badge badge-active">Enrolled</span>`
                : `<button class="btn btn-sm btn-primary" onclick="showEnrollModal(${m.id})">Enroll</button>`}
            </td>
        </tr>`).join('');
}

async function loadEnrolledModules() {
    const res = await apiFetch('/api/student/modules/enrolled');
    if (!res) return;
    const mods = await res.json();
    enrolledModuleIds = new Set(mods.map(m => m.id));
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
        renderBrowseModules(currentBrowseModules);
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
let studentResults = [];

async function initResults() {
    setLoading('resultsTbody');
    const res = await apiFetch('/api/student/results');
    if (!res) return;
    studentResults = await res.json();
    const tbody = document.getElementById('resultsTbody');
    if (!tbody) return;
    if (!studentResults.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:40px">No results released yet.</td></tr>`;
        return;
    }
    const dlBtn = document.getElementById('downloadMarksheetBtn');
    if (dlBtn) dlBtn.style.display = 'inline-flex';

    tbody.innerHTML = studentResults.map(a => {
        const total = (a.autoScore || 0) + (a.manualScore || 0);
        const pct   = a.maxScore ? Math.round(total / a.maxScore * 100) : 0;
        const grade = getGrade(pct);
        const gradeColor = getGradeColor(pct);
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

function downloadStudentMarksheet() {
    if (!studentResults.length) return;
    const u = getUser();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Student Result Sheet', 14, 18);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Name     : ${u?.fullName || u?.username || '—'}`, 14, 28);
    doc.text(`Username : ${u?.username || '—'}`, 14, 35);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 46, 196, 46);

    // Table rows
    const rows = studentResults.map((a, i) => {
        const total = (a.autoScore || 0) + (a.manualScore || 0);
        const pct   = a.maxScore ? Math.round(total / a.maxScore * 100) : 0;
        return [
            i + 1,
            esc(a.exam?.module?.name || '—'),
            esc(a.exam?.title || '—'),
            `${total} / ${a.maxScore || 0}`,
            `${pct}%`,
            getGrade(pct)
        ];
    });

    doc.autoTable({
        startY: 50,
        head: [['#', 'Module', 'Exam', 'Mark', '%', 'Grade']],
        body: rows,
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center', fontStyle: 'bold' }
        },
        styles: { cellPadding: 4 },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 5) {
                const grade = data.cell.text[0];
                if (['A+','A','A-'].includes(grade))       data.cell.styles.textColor = [22, 163, 74];
                else if (grade.startsWith('B'))            data.cell.styles.textColor = [37, 99, 235];
                else if (grade.startsWith('C'))            data.cell.styles.textColor = [217, 119, 6];
                else if (grade.startsWith('D'))            data.cell.styles.textColor = [234, 88, 12];
                else                                       data.cell.styles.textColor = [220, 38, 38];
            }
        }
    });

    doc.save(`ResultSheet_${u?.username || 'student'}.pdf`);
}

/* ============================================================
   ANNOUNCEMENTS
   ============================================================ */
let allAnnouncements = [];

async function initAnnouncements() {
    const res = await apiFetch('/api/student/announcements');
    if (!res) return;
    allAnnouncements = await res.json();
    filterAnnouncements();
    markAllRead();
}

function filterAnnouncements() {
    const filter = document.getElementById('announcementFilterSel')?.value || 'ALL';
    const list = filter === 'ALL' ? allAnnouncements
        : filter === 'UNREAD' ? allAnnouncements.filter(a => !a.read)
        : allAnnouncements.filter(a => a.read);
    renderAnnouncements(list);
}

function renderAnnouncements(list) {
    const container = document.getElementById('announcementsContainer');
    if (!container) return;
    if (!list.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-bell-slash fa-3x"></i></div><p>No announcements found.</p></div>`;
        return;
    }
    container.innerHTML = list.map(a => `
        <div class="card" style="margin-bottom:14px;border-left:4px solid ${a.read ? '#e2e8f0' : '#2563eb'}">
            <div class="card-header" style="padding:14px 18px;gap:12px">
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                        ${!a.read ? '<span style="width:8px;height:8px;border-radius:50%;background:#2563eb;display:inline-block;flex-shrink:0"></span>' : ''}
                        <strong style="font-size:15px">${esc(a.title)}</strong>
                        ${a.module ? `<span class="badge badge-draft">${esc(a.module.name)}</span>` : '<span class="badge badge-active">Global</span>'}
                    </div>
                    <div class="text-muted" style="font-size:12px;margin-top:4px">
                        Posted by ${esc(a.postedBy?.fullName || a.postedBy?.username || '—')} · ${formatDate(a.createdAt)}
                    </div>
                </div>
            </div>
            <div style="padding:0 18px 16px;color:#374151;white-space:pre-wrap">${esc(a.message)}</div>
        </div>`).join('');
}

async function markAllRead() {
    const unread = allAnnouncements.filter(a => !a.read).map(a => a.id);
    if (!unread.length) return;
    const res = await apiFetch('/api/student/announcements/mark-read', {
        method: 'POST', body: JSON.stringify({ ids: unread })
    });
    if (res && res.ok) {
        allAnnouncements.forEach(a => { a.read = true; });
        const badge = document.getElementById('notifBadge');
        if (badge) badge.style.display = 'none';
    }
}

/* ============================================================
   CONCERNS
   ============================================================ */
let allConcerns = [];
let replyingConcernId = null;

async function initConcerns() {
    await Promise.all([loadConcerns(), loadConcernExams()]);
}

async function loadConcerns() {
    setLoading('concernsTbody');
    const res = await apiFetch('/api/student/concerns');
    if (!res) return;
    allConcerns = await res.json();
    renderConcerns(allConcerns);
}

async function loadConcernExams() {
    const res = await apiFetch('/api/student/modules/enrolled');
    if (!res) return;
    const mods = await res.json();
    const examResults = await Promise.all(
        mods.map(m => apiFetch(`/api/student/modules/${m.id}/exams`).then(r => r ? r.json() : []))
    );
    const exams = examResults.flat();
    const sel = document.getElementById('concernExamSel');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Exam --</option>' +
        exams.map(e => `<option value="${e.id}">${esc(e.module?.name || '')} – ${esc(e.title)}</option>`).join('');
}

function renderConcerns(list) {
    const tbody = document.getElementById('concernsTbody');
    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:32px">No concerns submitted yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(c => `
        <tr>
            <td><strong>${esc(c.exam?.title || '—')}</strong><div class="text-muted">${esc(c.exam?.module?.name || '')}</div></td>
            <td>${esc(c.subject)}</td>
            <td style="max-width:220px;white-space:normal">${esc(c.message)}</td>
            <td><span class="badge ${c.status === 'RESOLVED' ? 'badge-active' : 'badge-draft'}">${c.status}</span></td>
            <td class="text-muted">${formatDate(c.createdAt)}</td>
            <td style="max-width:220px;white-space:normal">
                ${c.lecturerReply
                    ? `<div style="color:#374151">${esc(c.lecturerReply)}</div><div class="text-muted" style="font-size:12px">${formatDate(c.repliedAt)}</div>`
                    : '<span class="text-muted">Awaiting reply</span>'}
            </td>
        </tr>`).join('');
}

function openConcernModal() {
    document.getElementById('concernSubject').value = '';
    document.getElementById('concernMessage').value = '';
    document.getElementById('concernExamSel').value = '';
    document.getElementById('concernError').classList.add('hidden');
    openModal('concernModal');
}

async function submitConcern() {
    const examId  = document.getElementById('concernExamSel').value;
    const subject = document.getElementById('concernSubject').value.trim();
    const message = document.getElementById('concernMessage').value.trim();
    const errEl   = document.getElementById('concernError');

    if (!examId)  { errEl.textContent = 'Please select an exam.'; errEl.classList.remove('hidden'); return; }
    if (!subject) { errEl.textContent = 'Please enter a subject.'; errEl.classList.remove('hidden'); return; }
    if (!message) { errEl.textContent = 'Please enter your concern.'; errEl.classList.remove('hidden'); return; }

    errEl.classList.add('hidden');
    const res = await apiFetch('/api/student/concerns', {
        method: 'POST',
        body: JSON.stringify({ examId, subject, message })
    });
    if (!res) return;
    if (res.ok) {
        closeModal('concernModal');
        toast('Concern submitted successfully.');
        await loadConcerns();
    } else {
        const d = await res.json().catch(() => ({}));
        errEl.textContent = d.message || 'Failed to submit concern.';
        errEl.classList.remove('hidden');
    }
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
