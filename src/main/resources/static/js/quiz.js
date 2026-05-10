/* ===========================
   quiz.js – Quiz Engine
   =========================== */
const user = checkAuth('STUDENT');
if (user) populateSidebarUser();

let attemptId     = null;
let questions     = [];
let currentIdx    = 0;
let answered      = new Set();
let answerCache   = new Map();   // questionId → { selectedOptionIds, shortAnswerText }
let timerInterval = null;
let secondsLeft   = 0;
let submitted     = false;

/* ============================================================
   INIT
   ============================================================ */
async function initQuiz() {
    attemptId = sessionStorage.getItem('attemptId');
    if (!attemptId) { window.location.href = '/pages/student/exams.html'; return; }

    await loadQuestions();
    await refreshStatus();
    startTimer();

    // Poll status every 30 seconds
    setInterval(refreshStatus, 30000);
}

async function loadQuestions() {
    // Fetch questions and any previously saved answers in parallel
    const [qRes, aRes] = await Promise.all([
        apiFetch(`/api/quiz/${attemptId}/questions`),
        apiFetch(`/api/quiz/${attemptId}/answers`)
    ]);
    if (!qRes || !aRes) return;
    questions = await qRes.json();
    const savedAnswers = await aRes.json();

    // Populate cache and answered set from backend data
    answerCache.clear();
    answered.clear();
    savedAnswers.forEach(a => {
        answerCache.set(a.questionId, {
            selectedOptionIds: a.selectedOptionIds || '',
            shortAnswerText:   a.shortAnswerText   || ''
        });
        // Mark as answered if any content was saved
        if (a.selectedOptionIds || a.shortAnswerText) {
            const q = questions.find(q => q.id == a.questionId);
            if (q) answered.add(q.id);
        }
    });

    buildGrid();
    if (questions.length) loadQuestion(0);
}

async function refreshStatus() {
    const res = await apiFetch(`/api/quiz/${attemptId}/status`);
    if (!res) return;
    const data = await res.json();

    secondsLeft = data.secondsRemaining;
    renderTimer(secondsLeft);

    document.getElementById('answeredCount').textContent = answered.size;

    if (data.attemptStatus !== 'IN_PROGRESS') {
        submitted = true;
        clearInterval(timerInterval);
        showSubmittedScreen();
    }

    if (questions.length && questions[0].exam) {
        const e = questions[0].exam;
        document.getElementById('examTitle').textContent   = e.title || '';
        document.getElementById('moduleTitle').textContent = e.module?.name || '';
    }
}

/* ============================================================
   TIMER
   ============================================================ */
function startTimer() {
    timerInterval = setInterval(() => {
        if (submitted) { clearInterval(timerInterval); return; }
        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
            return;
        }
        secondsLeft--;
        renderTimer(secondsLeft);
    }, 1000);
}

function renderTimer(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const el = document.getElementById('timer');
    if (!el) return;
    el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    el.className = 'quiz-timer';
    if (seconds <= 60)       el.classList.add('danger');
    else if (seconds <= 300) el.classList.add('warning');
    else                     el.classList.add('normal');
}

function pad(n) { return String(n).padStart(2, '0'); }

async function handleTimeout() {
    if (submitted) return;
    submitted = true;
    clearInterval(timerInterval);
    apiFetch(`/api/quiz/${attemptId}/submit`, { method: 'POST' });
    showSubmittedScreen('Time is up! Your exam has been automatically submitted.');
}

/* ============================================================
   QUESTION DISPLAY
   ============================================================ */
function loadQuestion(idx) {
    if (idx < 0 || idx >= questions.length) return;
    currentIdx = idx;
    const q = questions[idx];

    document.getElementById('questionMeta').textContent = `Question ${idx + 1} of ${questions.length}`;
    const qtEl = document.getElementById('questionText');
    qtEl.style.whiteSpace = 'pre-wrap';
    qtEl.textContent = q.questionText;
    document.getElementById('marksLabel').textContent = `${q.marks} mark${q.marks > 1 ? 's' : ''}`;

    const area = document.getElementById('answerArea');
    area.innerHTML = '';

    if (q.questionType === 'SHORT_ANSWER') {
        const ta = document.createElement('textarea');
        ta.className = 'short-answer-area';
        ta.id = 'shortAns';
        ta.placeholder = 'Type your answer here...';
        ta.oninput = () => cacheShortAnswer(q.id);
        ta.onblur  = () => saveShortAnswer(q.id);
        area.appendChild(ta);
    } else {
        const inputType = q.questionType === 'MULTI_SELECT' ? 'checkbox' : 'radio';
        const ol = document.createElement('ul');
        ol.className = 'option-list';
        (q.options || []).forEach(opt => {
            const li = document.createElement('li');
            li.className = 'option-item';
            li.id = `opt-li-${opt.id}`;
            li.innerHTML = `
                <input type="${inputType}" name="quiz_opt" id="opt-${opt.id}" value="${opt.id}">
                <label class="option-label" for="opt-${opt.id}">${escHtml(opt.optionText)}</label>`;
            li.querySelector('input').onchange = () => saveAnswer(q.id);
            li.onclick = (e) => { if (e.target.tagName !== 'INPUT') li.querySelector('input').click(); };
            ol.appendChild(li);
        });
        area.appendChild(ol);
    }

    // Restore previously saved answer from cache (synchronous, no extra fetch)
    restoreAnswer(q);

    updateNavButtons();
    highlightGrid();
}

function restoreAnswer(q) {
    const cached = answerCache.get(q.id);
    if (!cached) return;

    if (q.questionType === 'SHORT_ANSWER') {
        const ta = document.getElementById('shortAns');
        if (ta) ta.value = cached.shortAnswerText || '';
    } else {
        const selectedIds = cached.selectedOptionIds
            ? cached.selectedOptionIds.split(',').map(Number).filter(Boolean)
            : [];
        selectedIds.forEach(optId => {
            const input = document.getElementById(`opt-${optId}`);
            if (input) {
                input.checked = true;
                input.closest('.option-item')?.classList.add('selected');
            }
        });
    }
}

/* ============================================================
   SAVING ANSWERS
   ============================================================ */
async function saveAnswer(questionId) {
    const inputs = document.querySelectorAll('input[name="quiz_opt"]:checked');
    const selectedOptionIds = Array.from(inputs).map(i => parseInt(i.value));

    // Visual update
    document.querySelectorAll('.option-item').forEach(li => li.classList.remove('selected'));
    inputs.forEach(i => i.closest('.option-item')?.classList.add('selected'));

    // Update cache immediately so navigation always restores the latest choice
    answerCache.set(questionId, {
        selectedOptionIds: selectedOptionIds.join(','),
        shortAnswerText:   ''
    });

    const res = await apiFetch(`/api/quiz/${attemptId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedOptionIds, shortAnswerText: null })
    });
    if (res && res.ok) {
        answered.add(questionId);
        markItemAnswered(currentIdx);
        highlightGrid();
    }
}

function cacheShortAnswer(questionId) {
    // Update cache on every keystroke so navigation is always in sync
    const text = document.getElementById('shortAns')?.value || '';
    answerCache.set(questionId, { selectedOptionIds: '', shortAnswerText: text });
    // Mark as answered locally as soon as something is typed
    if (text.trim()) {
        answered.add(questionId);
        markItemAnswered(currentIdx);
        highlightGrid();
    }
}

async function saveShortAnswer(questionId) {
    const text = document.getElementById('shortAns')?.value || '';
    // Cache is already up to date from cacheShortAnswer; just persist to backend
    const res = await apiFetch(`/api/quiz/${attemptId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedOptionIds: [], shortAnswerText: text })
    });
    if (res && res.ok) {
        if (text.trim()) {
            answered.add(questionId);
            markItemAnswered(currentIdx);
            highlightGrid();
        }
    }
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function goNext() {
    saveCurrentShortAnswerIfNeeded();
    if (currentIdx < questions.length - 1) loadQuestion(currentIdx + 1);
}

function goPrevious() {
    saveCurrentShortAnswerIfNeeded();
    if (currentIdx > 0) loadQuestion(currentIdx - 1);
}

function goToQuestion(idx) {
    saveCurrentShortAnswerIfNeeded();
    loadQuestion(idx);
}

function saveCurrentShortAnswerIfNeeded() {
    const q = questions[currentIdx];
    if (q && q.questionType === 'SHORT_ANSWER') {
        const ta = document.getElementById('shortAns');
        if (ta && document.activeElement === ta) {
            // Trigger the save explicitly when navigating away from a focused textarea
            saveShortAnswer(q.id);
        }
    }
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const isLast = currentIdx === questions.length - 1;
    if (prevBtn) prevBtn.disabled = currentIdx === 0;
    if (nextBtn) {
        if (isLast) {
            nextBtn.textContent = 'Submit Exam';
            nextBtn.className = 'btn btn-danger';
            nextBtn.onclick = confirmSubmit;
            nextBtn.disabled = false;
        } else {
            nextBtn.textContent = 'Next →';
            nextBtn.className = 'btn btn-secondary';
            nextBtn.onclick = goNext;
            nextBtn.disabled = false;
        }
    }
    document.getElementById('questionProgress').textContent = `${currentIdx + 1} / ${questions.length}`;
}

/* ============================================================
   GRID
   ============================================================ */
function buildGrid() {
    const grid = document.getElementById('questionGrid');
    if (!grid) return;
    grid.innerHTML = '';
    questions.forEach((q, i) => {
        const btn = document.createElement('button');
        btn.className = 'grid-btn';
        btn.id = `grid-${i}`;
        btn.textContent = i + 1;
        btn.onclick = () => goToQuestion(i);
        grid.appendChild(btn);
    });
    document.getElementById('answeredCount').textContent = answered.size;
}

function highlightGrid() {
    questions.forEach((q, i) => {
        const btn = document.getElementById(`grid-${i}`);
        if (!btn) return;
        btn.className = 'grid-btn';
        if (i === currentIdx)        btn.classList.add('current');
        else if (answered.has(q.id)) btn.classList.add('answered');
    });
    document.getElementById('answeredCount').textContent = answered.size;
}

function markItemAnswered(idx) {
    const btn = document.getElementById(`grid-${idx}`);
    if (btn && idx !== currentIdx) btn.classList.add('answered');
    document.getElementById('answeredCount').textContent = answered.size;
}

/* ============================================================
   SUBMIT
   ============================================================ */
async function confirmSubmit() {
    if (submitted) return;
    saveCurrentShortAnswerIfNeeded();
    const unanswered = questions.filter(q => !answered.has(q.id)).length;
    const msg = unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}.\n\nAre you sure you want to submit?`
        : 'Submit your exam? This cannot be undone.';
    if (!confirm(msg)) return;

    const res = await apiFetch(`/api/quiz/${attemptId}/submit`, { method: 'POST' });
    if (!res) return;
    if (res.ok) {
        submitted = true;
        clearInterval(timerInterval);
        showSubmittedScreen();
    } else toast('Failed to submit. Try again.', 'error');
}

function showSubmittedScreen(msg) {
    const content = document.getElementById('quizContent');
    if (!content) return;
    const subtitle = msg || 'Your answers have been recorded. Results will be available after your lecturer releases them.';
    content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
            <div class="card" style="text-align:center;max-width:480px;padding:48px">
                <div style="margin-bottom:16px"><i class="fas fa-circle-check" style="font-size:64px;color:#16a34a"></i></div>
                <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">Exam Submitted!</h2>
                <p style="color:#64748b;margin-bottom:24px">${escHtml(subtitle)}</p>
                <a href="/pages/student/results.html" class="btn btn-primary">View Results</a>
                &nbsp;
                <a href="/pages/student/dashboard.html" class="btn btn-secondary">Dashboard</a>
            </div>
        </div>`;
}

/* ============================================================
   Helpers
   ============================================================ */
function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
