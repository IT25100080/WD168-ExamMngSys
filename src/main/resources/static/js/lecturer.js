/* ===========================
   lecturer.js – Lecturer module
   =========================== */
const user = checkAuth('LECTURER');
if (user) populateSidebarUser();

/* ============================================================
   DASHBOARD
   ============================================================ */
async function initDashboard() {
    const u = getUser();
    setText('greetingHeading', `${getTimeGreeting()}, ${u?.fullName || u?.username || ''}!`);

    const [modRes, examRes] = await Promise.all([
        apiFetch('/api/lecturer/modules'),
        apiFetch('/api/lecturer/exams')
    ]);
    if (!modRes || !examRes) return;
    const mods  = await modRes.json();
    const exams = await examRes.json();

    setText('statModules', mods.length);
    setText('statExams',   exams.length);
    setText('statActive',  exams.filter(e => e.status === 'ACTIVE').length);
    setText('statDraft',   exams.filter(e => e.status === 'DRAFT').length);

    const tbody = document.getElementById('moduleTbody');
    if (tbody) {
        tbody.innerHTML = mods.length ? mods.map(m => `
            <tr>
                <td><strong>${esc(m.moduleCode)}</strong></td>
                <td>${esc(m.name)}</td>
                <td>${esc(m.semester?.academicYear?.name || '—')}</td>
                <td>${esc(m.semester ? m.semester.name : '—')}</td>
                <td><a class="btn btn-sm btn-primary" href="/pages/lecturer/exams.html">Manage Exams</a></td>
            </tr>`).join('')
            : `<tr><td colspan="4" class="text-center text-muted" style="padding:32px">No modules assigned.</td></tr>`;
    }

    const examTbody = document.getElementById('examTbody');
    if (examTbody) {
        examTbody.innerHTML = exams.length ? exams.slice(0, 6).map(e => `
            <tr>
                <td>${esc(e.title)}</td>
                <td>${esc(e.module ? e.module.name : '—')}</td>
                <td><span class="badge badge-${e.status.toLowerCase()}">${e.status}</span></td>
                <td>${e.durationMinutes} min</td>
            </tr>`).join('')
            : `<tr><td colspan="4" class="text-center text-muted" style="padding:32px">No exams yet.</td></tr>`;
    }
}

/* ============================================================
   EXAMS & QUESTIONS — Hierarchical View
   ============================================================ */
let lecturerModules = [];
let allExams        = [];
let editingExamId   = null;
let activeModuleId  = null;
let expandedExams   = new Set();
let examQuestionsCache = {};
let currentExamId      = null;
let editingQuestionId  = null;
let editingQuestionExamId = null;
let optionCount        = 0;

async function initExams() {
    const [modRes, examRes] = await Promise.all([
        apiFetch('/api/lecturer/modules'),
        apiFetch('/api/lecturer/exams')
    ]);
    if (!modRes || !examRes) return;
    lecturerModules = await modRes.json();
    allExams        = await examRes.json();
    renderModuleTabs();
    if (lecturerModules.length) selectModuleTab(lecturerModules[0].id);
}

function renderModuleTabs() {
    const tabs = document.getElementById('moduleTabs');
    if (!tabs) return;
    if (!lecturerModules.length) {
        tabs.innerHTML = '<p class="text-muted" style="padding:8px 0">No modules assigned to you yet.</p>';
        return;
    }
    tabs.innerHTML = lecturerModules.map(m => `
        <button class="module-tab" id="tab-${m.id}" onclick="selectModuleTab(${m.id})">
            <strong>${esc(m.moduleCode)}</strong>
            ${esc(m.name)}
        </button>`).join('');
}

function selectModuleTab(moduleId) {
    activeModuleId = moduleId;
    lecturerModules.forEach(m => {
        const t = document.getElementById(`tab-${m.id}`);
        if (t) t.classList.toggle('active', m.id === moduleId);
    });
    renderExamAccordion(moduleId);
}

function renderExamAccordion(moduleId) {
    const container = document.getElementById('examsContainer');
    if (!container) return;
    const mod = lecturerModules.find(m => m.id === moduleId);
    const moduleExams = allExams.filter(e => e.module && e.module.id === moduleId);

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2>${esc(mod?.moduleCode || '')} – ${esc(mod?.name || '')}</h2>
                <button class="btn btn-primary btn-sm" onclick="showCreateExamModal()">+ Create Exam</button>
            </div>
            ${moduleExams.length === 0
                ? `<div class="empty-state" style="padding:48px">
                       <div class="empty-icon"><i class="fas fa-file-pen fa-3x"></i></div>
                       <p>No exams yet. Click "Create Exam" to add one.</p>
                   </div>`
                : moduleExams.map(e => renderExamCard(e)).join('')}
        </div>`;
}

function renderExamCard(exam) {
    const isExpanded = expandedExams.has(exam.id);
    return `
    <div class="exam-accordion" id="exam-${exam.id}">
        <div class="exam-accordion-header" onclick="toggleExam(${exam.id})">
            <div class="exam-accordion-title">
                <span class="exam-accordion-arrow${isExpanded ? ' open' : ''}">▶</span>
                <div>
                    <strong style="font-size:15px">${esc(exam.title)}</strong>
                    <div style="font-size:12px;color:#64748b;margin-top:2px">${exam.durationMinutes} min</div>
                </div>
            </div>
            <div class="exam-accordion-meta">
                <span class="badge badge-${exam.status.toLowerCase()}">${exam.status}</span>
                ${exam.resultsReleased ? '<span class="badge badge-released">Released</span>' : ''}
                <div class="actions-cell" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-warning" onclick="showEditExamModal(${exam.id})">Edit</button>
                    <a class="btn btn-sm btn-info" href="/pages/lecturer/results.html?examId=${exam.id}">Results</a>
                    <button class="btn btn-sm btn-danger" onclick="deleteExam(${exam.id})">Delete</button>
                </div>
            </div>
        </div>
        <div class="exam-accordion-body${isExpanded ? '' : ' hidden'}" id="exam-body-${exam.id}">
            <div id="questions-container-${exam.id}">
                <div class="loading">Loading questions…</div>
            </div>
        </div>
    </div>`;
}

async function toggleExam(examId) {
    const body  = document.getElementById(`exam-body-${examId}`);
    const arrow = document.querySelector(`#exam-${examId} .exam-accordion-arrow`);
    if (!body) return;
    const isOpen = !body.classList.contains('hidden');
    if (isOpen) {
        body.classList.add('hidden');
        if (arrow) arrow.classList.remove('open');
        expandedExams.delete(examId);
    } else {
        body.classList.remove('hidden');
        if (arrow) arrow.classList.add('open');
        expandedExams.add(examId);
        if (examQuestionsCache[examId] === undefined) {
            await loadQuestionsInline(examId);
        } else {
            refreshQuestionsContainer(examId);
        }
    }
}

async function loadQuestionsInline(examId) {
    const res = await apiFetch(`/api/lecturer/exams/${examId}/questions`);
    if (!res) return;
    examQuestionsCache[examId] = await res.json();
    refreshQuestionsContainer(examId);
}

function refreshQuestionsContainer(examId) {
    const container = document.getElementById(`questions-container-${examId}`);
    if (container) container.innerHTML = renderQuestionsTable(examId);
}

function renderQuestionsTable(examId) {
    const qs = examQuestionsCache[examId] || [];
    const totalMarks = qs.reduce((s, q) => s + q.marks, 0);
    return `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span class="text-muted">${qs.length} question${qs.length !== 1 ? 's' : ''}&nbsp;·&nbsp;${totalMarks} total mark${totalMarks !== 1 ? 's' : ''}</span>
            <button class="btn btn-sm btn-primary" onclick="showAddQuestionModal(${examId})">+ Add Question</button>
        </div>
        ${qs.length === 0
            ? '<p class="text-muted text-center" style="padding:16px 0">No questions yet.</p>'
            : `<div class="table-wrapper">
               <table>
                 <thead><tr>
                   <th>#</th><th>Question</th><th>Type</th><th>Marks</th><th></th>
                 </tr></thead>
                 <tbody>
                   ${qs.map((q, i) => `
                   <tr>
                     <td style="color:#64748b">${i + 1}</td>
                     <td style="white-space:pre-wrap">${esc(q.questionText.length > 90 ? q.questionText.slice(0, 90) + '…' : q.questionText)}</td>
                     <td><span class="badge badge-draft">${q.questionType}</span></td>
                     <td>${q.marks}</td>
                     <td>
                       <div class="actions-cell">
                         <button class="btn btn-sm btn-warning" onclick="showEditQuestionModal(${q.id},${examId})">Edit</button>
                         <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${q.id},${examId})">Delete</button>
                       </div>
                     </td>
                   </tr>`).join('')}
                 </tbody>
               </table>
               </div>`}`;
}

function showCreateExamModal() {
    editingExamId = null;
    document.getElementById('examModalTitle').textContent = 'Create Exam';
    document.getElementById('examForm').reset();
    const sel = document.getElementById('examModuleId');
    sel.innerHTML = lecturerModules.map(m =>
        `<option value="${m.id}"${m.id === activeModuleId ? ' selected' : ''}>${esc(m.moduleCode)} – ${esc(m.name)}</option>`
    ).join('');
    openModal('examModal');
}

function showEditExamModal(id) {
    const exam = allExams.find(e => e.id === id);
    if (!exam) return;
    editingExamId = id;
    document.getElementById('examModalTitle').textContent = 'Edit Exam';
    const sel = document.getElementById('examModuleId');
    sel.innerHTML = lecturerModules.map(m =>
        `<option value="${m.id}"${m.id === exam.module?.id ? ' selected' : ''}>${esc(m.moduleCode)} – ${esc(m.name)}</option>`
    ).join('');
    document.getElementById('examTitle').value       = exam.title;
    document.getElementById('examDesc').value        = exam.description || '';
    document.getElementById('examDuration').value    = exam.durationMinutes;
    document.getElementById('examPassword').value    = exam.accessPassword;
    document.getElementById('examStatus').value      = exam.status;
    document.getElementById('examMaxAttempts').value = exam.maxAttempts || 1;
    if (exam.startTime) document.getElementById('examStart').value = exam.startTime.slice(0, 16);
    if (exam.endTime)   document.getElementById('examEnd').value   = exam.endTime.slice(0, 16);
    openModal('examModal');
}

async function saveExam() {
    const moduleId        = parseInt(document.getElementById('examModuleId').value);
    const title           = document.getElementById('examTitle').value.trim();
    const description     = document.getElementById('examDesc').value.trim();
    const durationMinutes = parseInt(document.getElementById('examDuration').value);
    const accessPassword  = document.getElementById('examPassword').value.trim();
    const status          = document.getElementById('examStatus').value;
    const maxAttempts     = parseInt(document.getElementById('examMaxAttempts').value) || 1;
    const startRaw        = document.getElementById('examStart').value;
    const endRaw          = document.getElementById('examEnd').value;
    if (!moduleId || !title || !durationMinutes || !accessPassword) { toast('Required fields are missing.', 'error'); return; }
    const body = { moduleId, title, description, durationMinutes, accessPassword, status, maxAttempts,
        startTime: startRaw || null, endTime: endRaw || null };
    const res = editingExamId
        ? await apiFetch(`/api/lecturer/exams/${editingExamId}`, { method: 'PUT', body: JSON.stringify(body) })
        : await apiFetch('/api/lecturer/exams', { method: 'POST', body: JSON.stringify(body) });
    if (!res) return;
    if (res.ok) {
        closeModal('examModal');
        toast(editingExamId ? 'Exam updated.' : 'Exam created.');
        const eR = await apiFetch('/api/lecturer/exams');
        if (eR) allExams = await eR.json();
        renderExamAccordion(activeModuleId);
    } else { const d = await res.json(); toast(d.message || 'Failed.', 'error'); }
}

async function deleteExam(id) {
    if (!confirm('Delete this exam and all its questions?')) return;
    const res = await apiFetch(`/api/lecturer/exams/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
        toast('Exam deleted.');
        allExams = allExams.filter(e => e.id !== id);
        expandedExams.delete(id);
        delete examQuestionsCache[id];
        renderExamAccordion(activeModuleId);
    } else toast('Failed.', 'error');
}

function showAddQuestionModal(examId) {
    editingQuestionId = null;
    editingQuestionExamId = null;
    currentExamId = examId;
    document.getElementById('questionModalTitle').textContent = 'Add Question';
    document.getElementById('questionForm').reset();
    optionCount = 0;
    document.getElementById('optionsSection').classList.add('hidden');
    document.getElementById('optionRows').innerHTML = '';
    openModal('questionModal');
}

function showEditQuestionModal(questionId, examId) {
    const question = (examQuestionsCache[examId] || []).find(q => q.id === questionId);
    if (!question) return;

    editingQuestionId = questionId;
    editingQuestionExamId = examId;
    currentExamId = examId;
    document.getElementById('questionModalTitle').textContent = 'Edit Question';
    document.getElementById('questionForm').reset();
    optionCount = 0;
    document.getElementById('optionRows').innerHTML = '';

    document.getElementById('qText').value  = question.questionText;
    document.getElementById('qMarks').value = question.marks;
    document.getElementById('qType').value  = question.questionType;

    const sec = document.getElementById('optionsSection');
    if (question.questionType === 'SHORT_ANSWER') {
        sec.classList.add('hidden');
    } else {
        sec.classList.remove('hidden');
        if (question.questionType === 'TRUE_FALSE') {
            const trueIsCorrect = (question.options || []).some(o => o.optionText === 'True' && o.isCorrect);
            addOption('True',  trueIsCorrect,  'radio');
            addOption('False', !trueIsCorrect, 'radio');
            document.getElementById('addOptionBtn').classList.add('hidden');
        } else {
            document.getElementById('addOptionBtn').classList.remove('hidden');
            const inputType = question.questionType === 'MULTI_SELECT' ? 'checkbox' : 'radio';
            (question.options || []).forEach(o => addOption(o.optionText, o.isCorrect, inputType));
        }
    }
    openModal('questionModal');
}

function onQuestionTypeChange() {
    const type = document.getElementById('qType').value;
    const sec  = document.getElementById('optionsSection');
    if (type === 'SHORT_ANSWER') { sec.classList.add('hidden'); return; }
    sec.classList.remove('hidden');
    document.getElementById('optionRows').innerHTML = '';
    optionCount = 0;
    if (type === 'TRUE_FALSE') {
        addOption('True', true, 'radio');
        addOption('False', false, 'radio');
        document.getElementById('addOptionBtn').classList.add('hidden');
    } else {
        document.getElementById('addOptionBtn').classList.remove('hidden');
        addOption('', false, type === 'MULTI_SELECT' ? 'checkbox' : 'radio');
        addOption('', false, type === 'MULTI_SELECT' ? 'checkbox' : 'radio');
    }
}

function addOption(text = '', correct = false, inputType = 'radio') {
    optionCount++;
    const row = document.createElement('div');
    row.className = 'option-editor-row';
    row.id = `opt-${optionCount}`;
    row.innerHTML = `
        <input type="${inputType}" name="correctOpt" class="opt-correct" ${correct ? 'checked' : ''} title="Mark as correct">
        <input type="text" class="opt-text" value="${esc(text)}" placeholder="Option text">
        <button type="button" class="btn btn-sm btn-danger btn-icon" onclick="removeOption('opt-${optionCount}')"><i class="fas fa-xmark"></i></button>`;
    document.getElementById('optionRows').appendChild(row);
}

function removeOption(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

async function saveQuestion() {
    const questionText = document.getElementById('qText').value.trim();
    const questionType = document.getElementById('qType').value;
    const marks = parseInt(document.getElementById('qMarks').value) || 1;
    if (!questionText || !questionType) { toast('Fill in the question text and type.', 'error'); return; }

    let options = null;
    if (questionType !== 'SHORT_ANSWER') {
        options = [];
        document.querySelectorAll('.option-editor-row').forEach(row => {
            const optionText = row.querySelector('.opt-text').value.trim();
            const isCorrect  = row.querySelector('.opt-correct').checked;
            if (optionText) options.push({ optionText, isCorrect });
        });
        if (!options.length) { toast('Add at least one option.', 'error'); return; }
        if (!options.some(o => o.isCorrect)) { toast('Mark at least one option as correct.', 'error'); return; }
    }

    const url    = editingQuestionId
        ? `/api/lecturer/questions/${editingQuestionId}`
        : `/api/lecturer/exams/${currentExamId}/questions`;
    const method = editingQuestionId ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify({ questionText, questionType, marks, options }) });
    if (!res) return;
    if (res.ok) {
        closeModal('questionModal');
        toast(editingQuestionId ? 'Question updated.' : 'Question added.');
        const targetExamId = editingQuestionExamId ?? currentExamId;
        await loadQuestionsInline(targetExamId);
    } else { const d = await res.json(); toast(d.message || 'Failed.', 'error'); }
}

async function deleteQuestion(id, examId) {
    if (!confirm('Delete this question?')) return;
    const res = await apiFetch(`/api/lecturer/questions/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
        toast('Question deleted.');
        await loadQuestionsInline(examId);
    } else toast('Failed.', 'error');
}

/* kept for backwards compatibility with questions.html */
async function initQuestions() {
    const params = new URLSearchParams(location.search);
    currentExamId = params.get('examId');
    const [examRes, allExamRes] = await Promise.all([
        currentExamId ? apiFetch(`/api/lecturer/exams/${currentExamId}/questions`) : Promise.resolve(null),
        apiFetch('/api/lecturer/exams')
    ]);
    if (!allExamRes) return;
    allExams = await allExamRes.json();
    const sel = document.getElementById('examSelector');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Exam --</option>' +
        allExams.map(e => `<option value="${e.id}"${e.id == currentExamId ? ' selected' : ''}>${esc(e.title)}</option>`).join('');
    if (currentExamId && examRes) {
        examQuestionsCache[currentExamId] = await examRes.json();
    }
}

async function onExamChange() {
    currentExamId = document.getElementById('examSelector').value;
    if (!currentExamId) return;
    history.replaceState(null, '', `?examId=${currentExamId}`);
    const res = await apiFetch(`/api/lecturer/exams/${currentExamId}/questions`);
    if (res) examQuestionsCache[currentExamId] = await res.json();
}

/* ============================================================
   RESULTS & GRADING
   ============================================================ */
let resultsModules  = [];
let resultsAllExams = [];
let resultsModuleId = null;
let resultsExamId   = null;

async function initResults() {
    const [modRes, examRes] = await Promise.all([
        apiFetch('/api/lecturer/modules'),
        apiFetch('/api/lecturer/exams')
    ]);
    if (!modRes || !examRes) return;
    resultsModules  = await modRes.json();
    resultsAllExams = await examRes.json();

    const modSel = document.getElementById('resultsModuleSel');
    if (!modSel) return;
    modSel.innerHTML = '<option value="">-- Select Module --</option>' +
        resultsModules.map(m =>
            `<option value="${m.id}">${esc(m.moduleCode)} – ${esc(m.name)}</option>`
        ).join('');

    /* Pre-select module + exam when arriving via ?examId= */
    const params = new URLSearchParams(location.search);
    const preExamId = params.get('examId');
    if (preExamId) {
        const exam = resultsAllExams.find(e => e.id == preExamId);
        if (exam?.module?.id) {
            modSel.value = exam.module.id;
            resultsModuleId = String(exam.module.id);
            populateExamDropdown(exam.module.id, preExamId);
            resultsExamId = preExamId;
            await loadSingleExamResults(preExamId);
        }
    }
}

function populateExamDropdown(moduleId, selectedExamId = null) {
    const examSel = document.getElementById('resultsExamSel');
    if (!examSel) return;
    const moduleExams = resultsAllExams.filter(e => e.module && e.module.id == moduleId);
    examSel.disabled = moduleExams.length === 0;
    examSel.innerHTML = '<option value="">-- Select Exam --</option>' +
        moduleExams.map(e =>
            `<option value="${e.id}"${e.id == selectedExamId ? ' selected' : ''}>
                ${esc(e.title)} (${e.status})
            </option>`
        ).join('');
}

function onResultsModuleChange() {
    resultsModuleId = document.getElementById('resultsModuleSel').value || null;
    resultsExamId   = null;

    const examSel   = document.getElementById('resultsExamSel');
    const container = document.getElementById('moduleResultsContainer');

    if (!resultsModuleId) {
        examSel.innerHTML = '<option value="">-- Select Exam --</option>';
        examSel.disabled  = true;
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-clipboard-list fa-3x"></i></div>
            <p>Select a module and exam above to view student submissions.</p></div>`;
        return;
    }

    populateExamDropdown(resultsModuleId);
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-clipboard-list fa-3x"></i></div>
        <p>Select an exam above to view its submissions.</p></div>`;
}

async function onResultsExamChange() {
    resultsExamId = document.getElementById('resultsExamSel').value || null;
    const container = document.getElementById('moduleResultsContainer');
    if (!resultsExamId) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-clipboard-list fa-3x"></i></div>
            <p>Select an exam above to view its submissions.</p></div>`;
        return;
    }
    await loadSingleExamResults(resultsExamId);
}

async function loadSingleExamResults(examId) {
    const container = document.getElementById('moduleResultsContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading submissions…</div>';

    const exam = resultsAllExams.find(e => e.id == examId);
    if (!exam) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-clipboard-list fa-3x"></i></div><p>Exam not found.</p></div>`;
        return;
    }

    const [aRes, qRes] = await Promise.all([
        apiFetch(`/api/lecturer/exams/${examId}/attempts`),
        apiFetch(`/api/lecturer/exams/${examId}/questions`)
    ]);
    if (!aRes || !qRes) return;
    const attempts   = await aRes.json();
    const questions  = await qRes.json();

    container.innerHTML = renderExamSubmissionsCard(exam, attempts, questions);
    renderGradeChart(attempts);
}

function renderExamSubmissionsCard(exam, attempts, questions) {
    const total      = attempts.length;
    const submitted  = attempts.filter(a => a.status !== 'IN_PROGRESS').length;
    const inProgress = total - submitted;
    const maxScore   = attempts[0]?.maxScore || 0;
    const avgScore   = total
        ? (attempts.reduce((s, a) => s + (a.autoScore || 0) + (a.manualScore || 0), 0) / total).toFixed(1)
        : '—';
    const shortCount = questions.filter(q => q.questionType === 'SHORT_ANSWER').length;

    return `
    <div class="card" style="margin-bottom:20px" id="exam-result-card-${exam.id}">
        <div class="card-header" style="align-items:flex-start">
            <div style="flex:1;min-width:0">
                <h2 style="margin-bottom:6px">${esc(exam.title)}</h2>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                    <span class="badge badge-${exam.status.toLowerCase()}">${exam.status}</span>
                    ${exam.resultsReleased ? '<span class="badge badge-released">Results Released</span>' : ''}
                    <span class="text-muted">${exam.durationMinutes} min · ${questions.length} question${questions.length !== 1 ? 's' : ''}${shortCount ? ` · ${shortCount} short-answer` : ''}</span>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap">
                ${exam.resultsReleased
                    ? `<button class="btn btn-warning btn-sm" onclick="reviseResultsFor(${exam.id})"><i class="fas fa-pencil"></i> Revise Results</button>`
                    : `<button class="btn btn-success btn-sm" onclick="releaseResultsFor(${exam.id})"><i class="fas fa-lock-open"></i> Release Results</button>`}
                <button class="btn btn-secondary btn-sm" onclick="downloadMarksheetPDF()"><i class="fas fa-file-pdf"></i> Download PDF</button>
            </div>
        </div>

        <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
            <div class="stat-card"        style="padding:12px 16px"><div class="stat-value" style="font-size:22px">${total}</div><div class="stat-label">Total</div></div>
            <div class="stat-card green"  style="padding:12px 16px"><div class="stat-value" style="font-size:22px">${submitted}</div><div class="stat-label">Submitted</div></div>
            <div class="stat-card orange" style="padding:12px 16px"><div class="stat-value" style="font-size:22px">${inProgress}</div><div class="stat-label">In Progress</div></div>
            <div class="stat-card purple" style="padding:12px 16px"><div class="stat-value" style="font-size:22px">${avgScore}</div><div class="stat-label">Avg Score${maxScore ? ' / ' + maxScore : ''}</div></div>
        </div>

        ${total > 0 ? `
        <div style="padding:0 0 20px 0">
            <h3 style="font-size:14px;font-weight:600;color:#374151;margin-bottom:12px">Marks Distribution</h3>
            <div style="position:relative;height:220px">
                <canvas id="gradeDistChart"></canvas>
            </div>
        </div>` : ''}

        ${total === 0
            ? '<p class="text-muted text-center" style="padding:20px">No submissions yet.</p>'
            : `<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
                 <i class="fas fa-magnifying-glass" style="color:#9ca3af"></i>
                 <input type="text" id="submissionSearch_${exam.id}" class="form-control" placeholder="Search by student name or username…" style="max-width:320px" oninput="filterSubmissions(${exam.id})">
                 <span id="submissionSearchCount_${exam.id}" class="text-muted" style="font-size:13px"></span>
               </div>
               <div class="table-wrapper">
               <table>
                 <thead><tr>
                   <th>Student</th><th>Status</th><th>Auto</th><th>Manual</th><th>Total / Max</th><th>Grade</th><th>Submitted At</th><th></th>
                 </tr></thead>
                 <tbody>
                   ${attempts.map(a => {
                       const scored = (a.autoScore || 0) + (a.manualScore || 0);
                       const pct    = a.maxScore ? Math.round(scored / a.maxScore * 100) : 0;
                       const searchKey = `${a.student?.fullName || ''} ${a.student?.username || ''}`.toLowerCase();
                       return `<tr data-search="${searchKey}">
                         <td>
                           <strong>${esc(a.student?.fullName || a.student?.username || 'Unknown')}</strong>
                           <div class="text-muted">@${esc(a.student?.username || '')}</div>
                         </td>
                         <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
                         <td>${a.autoScore || 0}</td>
                         <td>${a.manualScore || 0}</td>
                         <td><strong style="color:#2563eb">${scored} / ${a.maxScore || 0}</strong></td>
                         <td><strong style="color:${getGradeColor(pct)}">${getGrade(pct)}</strong></td>
                         <td class="text-muted">${formatDate(a.endTime || a.startTime)}</td>
                         <td>
                           <div class="actions-cell">
                             <button class="btn btn-sm btn-info"
                               data-attempt-id="${a.id}"
                               data-student="${esc(a.student?.fullName || a.student?.username || 'Student')}"
                               data-exam="${esc(exam.title)}"
                               onclick="openInspectModal(this)">Inspect</button>
                           </div>
                         </td>
                       </tr>`;
                   }).join('')}
                 </tbody>
               </table>
               </div>`}
    </div>`;
}

async function openInspectModal(btn) {
    const attemptId   = btn.dataset.attemptId;
    const studentName = btn.dataset.student;
    const examTitle   = btn.dataset.exam;

    document.getElementById('inspectModalTitle').textContent = `${studentName} – ${examTitle}`;
    document.getElementById('inspectModalBody').innerHTML =
        '<div class="loading">Loading answers…</div>';
    openModal('inspectModal');

    const res = await apiFetch(`/api/lecturer/attempts/${attemptId}/answers`);
    if (!res || !res.ok) {
        document.getElementById('inspectModalBody').innerHTML =
            '<p class="text-muted text-center" style="padding:20px">Failed to load answers.</p>';
        return;
    }
    const answers = await res.json();
    renderInspectModalBody(attemptId, answers);
}

function renderInspectModalBody(attemptId, answers) {
    const body = document.getElementById('inspectModalBody');
    if (!answers.length) {
        body.innerHTML = '<p class="text-muted text-center" style="padding:20px">No answers recorded for this submission.</p>';
        return;
    }

    body.innerHTML = answers.map((a, i) => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <span class="text-muted">Q${i + 1}</span>
            <span class="badge badge-draft">${a.questionType.replace(/_/g, ' ')}</span>
            <span class="text-muted">${a.marks} mark${a.marks !== 1 ? 's' : ''}</span>
        </div>
        <p style="font-size:14px;font-weight:600;white-space:pre-wrap;line-height:1.55;margin-bottom:12px">${esc(a.questionText)}</p>

        ${a.questionType === 'SHORT_ANSWER' ? `
        <div>
            <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px">Student's Answer</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;
                        font-size:14px;min-height:52px;white-space:pre-wrap;line-height:1.6;margin-bottom:14px">
                ${a.shortAnswerText
                    ? esc(a.shortAnswerText)
                    : '<em style="color:#94a3b8">No answer provided</em>'}
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <label style="font-size:13px;font-weight:600;white-space:nowrap">
                    Award marks (0 – ${a.marks}):
                </label>
                <input type="number" min="0" max="${a.marks}" value="${a.awardedMarks || 0}"
                    class="form-control" style="width:90px"
                    id="igrade_${attemptId}_${a.questionId}">
                <button class="btn btn-success btn-sm"
                    onclick="saveInspectGrade(${attemptId},${a.questionId},${a.marks})">Save</button>
                <span id="igrade_ok_${attemptId}_${a.questionId}"
                    style="color:#16a34a;font-size:13px;display:none"><i class="fas fa-check"></i> Saved</span>
            </div>
        </div>
        ` : renderOptionsList(a.options || [])}
    </div>`).join('');
}

function renderOptionsList(options) {
    if (!options.length) {
        return `<div>
            <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px">Student's Answer</p>
            <p style="font-size:14px;color:#94a3b8"><em>Not answered</em></p>
        </div>`;
    }
    const rows = options.map(opt => {
        let bg, border, icon, textColor;
        if (opt.selected && opt.isCorrect)  { bg = '#dcfce7'; border = '#86efac'; icon = '<i class="fas fa-check"></i>'; textColor = '#15803d'; }
        else if (opt.selected && !opt.isCorrect) { bg = '#fee2e2'; border = '#fca5a5'; icon = '<i class="fas fa-xmark"></i>'; textColor = '#b91c1c'; }
        else if (!opt.selected && opt.isCorrect) { bg = '#fef9c3'; border = '#fde047'; icon = '→'; textColor = '#854d0e'; }
        else { bg = '#f8fafc'; border = '#e2e8f0'; icon = '·'; textColor = '#94a3b8'; }
        return `<div style="display:flex;gap:10px;align-items:center;padding:9px 12px;border-radius:7px;
                            margin-bottom:6px;background:${bg};border:1px solid ${border}">
            <span style="font-size:15px;width:18px;text-align:center;font-weight:700;color:${textColor};flex-shrink:0">${icon}</span>
            <span style="font-size:14px;color:${opt.selected || opt.isCorrect ? textColor : '#64748b'};
                         font-weight:${opt.selected ? '600' : '400'}">${esc(opt.optionText)}</span>
            ${opt.selected ? `<span style="margin-left:auto;font-size:11px;color:${textColor};font-weight:600">Selected</span>` : ''}
        </div>`;
    }).join('');
    return `<div>
        <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.4px">Student's Answer</p>
        ${rows}
        <p style="font-size:11px;color:#94a3b8;margin-top:8px">
            <span style="color:#15803d;font-weight:700"><i class="fas fa-check"></i></span> Correct selected &nbsp;
            <span style="color:#b91c1c;font-weight:700"><i class="fas fa-xmark"></i></span> Wrong selected &nbsp;
            <span style="color:#854d0e;font-weight:700">→</span> Correct not selected
        </p>
    </div>`;
}

async function saveInspectGrade(attemptId, questionId, maxMarks) {
    const input = document.getElementById(`igrade_${attemptId}_${questionId}`);
    const marks = parseInt(input.value);
    if (isNaN(marks) || marks < 0 || marks > maxMarks) {
        toast(`Enter a value between 0 and ${maxMarks}.`, 'error');
        return;
    }
    const res = await apiFetch(`/api/lecturer/attempts/${attemptId}/grade`, {
        method: 'PUT', body: JSON.stringify({ questionId, marks })
    });
    if (res && res.ok) {
        toast('Grade saved.');
        const ok = document.getElementById(`igrade_ok_${attemptId}_${questionId}`);
        if (ok) { ok.style.display = 'inline'; setTimeout(() => ok.style.display = 'none', 2500); }
        await loadSingleExamResults(resultsExamId);
    } else {
        toast('Failed to save grade.', 'error');
    }
}

async function releaseResultsFor(examId) {
    if (!confirm('Release results to students for this exam?')) return;
    const res = await apiFetch(`/api/lecturer/exams/${examId}/release-results`, { method: 'PUT' });
    if (res && res.ok) {
        toast('Results released to students.');
        const ex = resultsAllExams.find(e => e.id == examId);
        if (ex) ex.resultsReleased = true;
        await loadSingleExamResults(examId);
    } else toast('Failed to release results.', 'error');
}

async function reviseResultsFor(examId) {
    if (!confirm('Pull back results from students?')) return;
    const res = await apiFetch(`/api/lecturer/exams/${examId}/revise-results`, { method: 'PUT' });
    if (res && res.ok) {
        toast('Results pulled back.');
        const ex = resultsAllExams.find(e => e.id == examId);
        if (ex) ex.resultsReleased = false;
        await loadSingleExamResults(examId);
    } else toast('Failed to revise results.', 'error');
}


function filterSubmissions(examId) {
    const term = (document.getElementById(`submissionSearch_${examId}`)?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll(`#exam-result-card-${examId} tbody tr`);
    let visible = 0;
    rows.forEach(row => {
        const match = !term || (row.dataset.search || '').includes(term);
        row.style.display = match ? '' : 'none';
        if (match) visible++;
    });
    const countEl = document.getElementById(`submissionSearchCount_${examId}`);
    if (countEl) countEl.textContent = term ? `${visible} of ${rows.length} shown` : '';
}


/* ============================================================
   GRADE DISTRIBUTION CHART
   ============================================================ */
let _gradeChart = null;

function renderGradeChart(attempts) {
    const canvas = document.getElementById('gradeDistChart');
    if (!canvas) return;

    if (_gradeChart) { _gradeChart.destroy(); _gradeChart = null; }

    const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E'];
    const counts = Object.fromEntries(grades.map(g => [g, 0]));

    attempts.filter(a => a.status !== 'IN_PROGRESS').forEach(a => {
        const scored = (a.autoScore || 0) + (a.manualScore || 0);
        const pct    = a.maxScore ? Math.round(scored / a.maxScore * 100) : 0;
        counts[getGrade(pct)]++;
    });

    const bgColors = {
        'A+': '#16a34a', 'A': '#22c55e', 'A-': '#4ade80',
        'B+': '#1d4ed8', 'B': '#2563eb', 'B-': '#60a5fa',
        'C+': '#b45309', 'C': '#d97706', 'C-': '#fbbf24',
        'D+': '#c2410c', 'D': '#ea580c',
        'E':  '#dc2626'
    };

    _gradeChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: grades,
            datasets: [{
                label: 'Students',
                data: grades.map(g => counts[g]),
                backgroundColor: grades.map(g => bgColors[g]),
                borderRadius: 5,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} student${ctx.parsed.y !== 1 ? 's' : ''}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, precision: 0 },
                    grid: { color: '#f1f5f9' }
                }
            }
        }
    });
}

/* ============================================================
   MARKSHEET PDF
   ============================================================ */
async function downloadMarksheetPDF() {
    if (!resultsExamId) return;
    const exam = resultsAllExams.find(e => e.id == resultsExamId);
    const examTitle  = exam?.title      || 'Exam';
    const moduleCode = exam?.module?.moduleCode || '';
    const moduleName = exam?.module?.name       || '';

    const res = await apiFetch(`/api/lecturer/exams/${resultsExamId}/marksheet`);
    if (!res || !res.ok) { toast('Failed to load marksheet data.', 'error'); return; }
    const data = await res.json();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Marksheet', 14, 18);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Exam   : ${examTitle}`, 14, 28);
    doc.text(`Module : ${moduleCode}${moduleName ? ' – ' + moduleName : ''}`, 14, 35);
    doc.text(`Generated : ${new Date().toLocaleString()}`, 14, 42);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 46, 196, 46);

    // Table
    const rows = data.map((r, i) => {
        const pct   = r.maxScore ? Math.round(r.mark / r.maxScore * 100) : 0;
        const grade = getGrade(pct);
        return [i + 1, r.username, r.fullName || '—', `${r.mark} / ${r.maxScore}`, grade];
    });

    doc.autoTable({
        startY: 50,
        head: [['#', 'Username', 'Full Name', 'Mark', 'Grade']],
        body: rows,
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10
        },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            3: { halign: 'center' },
            4: { halign: 'center', fontStyle: 'bold' }
        },
        styles: { cellPadding: 4 },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 4) {
                const grade = data.cell.text[0];
                if (grade === 'A+' || grade === 'A' || grade === 'A-') {
                    data.cell.styles.textColor = [22, 163, 74];
                } else if (grade.startsWith('B')) {
                    data.cell.styles.textColor = [37, 99, 235];
                } else if (grade.startsWith('C')) {
                    data.cell.styles.textColor = [217, 119, 6];
                } else if (grade.startsWith('D')) {
                    data.cell.styles.textColor = [234, 88, 12];
                } else {
                    data.cell.styles.textColor = [220, 38, 38];
                }
            }
        }
    });

    const safeTitle = examTitle.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Marksheet_${moduleCode}_${safeTitle}.pdf`);
}

/* ============================================================
   Helpers
   ============================================================ */
function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString();
}
