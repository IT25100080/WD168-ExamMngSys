# Online Examination and Result Management System

## Project Overview
A web-based Online Examination and Result Management System built with **Spring Boot** and **H2 file-based database**. The system supports three user roles — Administrator, Lecturer, and Student — and provides a complete workflow from module setup to exam delivery and result management.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.x (Java 17+) |
| Security | Spring Security (session-based auth) |
| Database | H2 (file-based, persistent) |
| ORM | Spring Data JPA / Hibernate |
| Frontend | Plain HTML5 + CSS3 + Vanilla JavaScript |
| Build Tool | Maven |
| Server | Embedded Tomcat (Spring Boot default) |

---

## System Users & Roles

### 1. Administrator
- View pre-built Academic Years (Year 1–4) — read-only, seeded at startup
- View pre-built Semesters (Semester 1 & Semester 2 per year) — read-only, seeded at startup
- Create Modules under each Semester with a unique Enrollment Key
- Assign **one or more Lecturers** to each Module (many-to-many)
- Remove individual lecturers from a module without affecting others
- Manage all system users

### 2. Lecturer
- View modules assigned to them (dashboard shows Academic Year, Semester, and Module Code)
- Manage Exams and Questions from a single hierarchical page: module tabs → exam accordion → inline questions
- Create, edit, and delete Exams under their modules (title, duration, access password, start/end time, status)
- Add, edit, and delete Questions within each exam (MCQ, True/False, Multi-select, Short Answer)
- View exam attempts and student responses
- Manually release results to students
- Grade short-answer questions manually
- Generate and download a Marksheet for a module (lists all enrolled students, their scores per exam, and totals)

### 3. Student
- Browse Academic Years → Semesters → Modules
- Enroll in a Module using the Enrollment Key
- View exams available under enrolled modules
- Enter the Exam Access Password to begin a quiz
- Take the quiz with a countdown timer and a question navigation grid
- Navigate questions randomly using the grid
- After submitting an exam, see only a "Submitted" / "Finished" confirmation — **no marks or score are shown at this point**
- View released results (only after the lecturer explicitly releases them)

---

## Database Schema

### Entity: `users`
```
id              BIGINT PK AUTO_INCREMENT
full_name       VARCHAR(100)
username        VARCHAR(50) UNIQUE NOT NULL
email           VARCHAR(100) UNIQUE NOT NULL
password        VARCHAR(255) NOT NULL  -- BCrypt hashed
role            ENUM('ADMIN', 'LECTURER', 'STUDENT')
created_at      TIMESTAMP
```

### Entity: `academic_years`
```
id              BIGINT PK AUTO_INCREMENT
name            VARCHAR(20) NOT NULL  -- e.g. "Year 1"
display_order   INT NOT NULL          -- 1, 2, 3, 4
```

### Entity: `semesters`
```
id              BIGINT PK AUTO_INCREMENT
academic_year_id BIGINT FK → academic_years.id
name            VARCHAR(20) NOT NULL  -- e.g. "Semester 1"
display_order   INT NOT NULL          -- 1, 2
```

### Entity: `modules`
```
id              BIGINT PK AUTO_INCREMENT
semester_id     BIGINT FK → semesters.id
name            VARCHAR(100) NOT NULL
module_code     VARCHAR(20) UNIQUE NOT NULL
description     TEXT
enrollment_key  VARCHAR(50) NOT NULL
created_at      TIMESTAMP
```

### Entity: `module_lecturers` (many-to-many join table)
```
module_id       BIGINT FK → modules.id
lecturer_id     BIGINT FK → users.id (role = LECTURER)
PRIMARY KEY (module_id, lecturer_id)
```
> Replaces the old single `lecturer_id` column on `modules`. Multiple lecturers can be assigned to one module.

### Entity: `student_modules` (enrollment)
```
id              BIGINT PK AUTO_INCREMENT
student_id      BIGINT FK → users.id (role = STUDENT)
module_id       BIGINT FK → modules.id
enrolled_at     TIMESTAMP
UNIQUE (student_id, module_id)
```

### Entity: `exams`
```
id              BIGINT PK AUTO_INCREMENT
module_id       BIGINT FK → modules.id
title           VARCHAR(150) NOT NULL
description     TEXT
duration_minutes INT NOT NULL
access_password VARCHAR(50) NOT NULL
start_time      TIMESTAMP
end_time        TIMESTAMP
status          ENUM('DRAFT', 'ACTIVE', 'CLOSED')
results_released BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP
```

### Entity: `questions`
```
id              BIGINT PK AUTO_INCREMENT
exam_id         BIGINT FK → exams.id
question_text   TEXT NOT NULL
question_type   ENUM('MCQ', 'TRUE_FALSE', 'MULTI_SELECT', 'SHORT_ANSWER')
marks           INT NOT NULL DEFAULT 1
display_order   INT
```

### Entity: `answer_options`
```
id              BIGINT PK AUTO_INCREMENT
question_id     BIGINT FK → questions.id
option_text     VARCHAR(255) NOT NULL
is_correct      BOOLEAN DEFAULT FALSE
```

### Entity: `exam_attempts`
```
id              BIGINT PK AUTO_INCREMENT
student_id      BIGINT FK → users.id
exam_id         BIGINT FK → exams.id
start_time      TIMESTAMP
end_time        TIMESTAMP
status          ENUM('IN_PROGRESS', 'SUBMITTED', 'TIMED_OUT')
auto_score      INT DEFAULT 0       -- auto-graded marks (MCQ, T/F, Multi)
manual_score    INT DEFAULT 0       -- manually awarded marks (Short Answer)
max_score       INT DEFAULT 0
UNIQUE (student_id, exam_id)
```

### Entity: `student_answers`
```
id              BIGINT PK AUTO_INCREMENT
attempt_id      BIGINT FK → exam_attempts.id
question_id     BIGINT FK → questions.id
selected_option_ids VARCHAR(255)   -- comma-separated AnswerOption IDs
short_answer_text   TEXT           -- for SHORT_ANSWER type
awarded_marks   INT DEFAULT 0      -- set by lecturer for SHORT_ANSWER
```

---

## Project Directory Structure

```
src/
└── main/
    ├── java/com/wd168/ExamMngSys/
    │   ├── ExamPortalApplication.java
    │   ├── config/
    │   │   ├── SecurityConfig.java
    │   │   └── DataInitializer.java        ← seeds default admin user
    │   ├── controller/
    │   │   ├── RootController.java         ← GET / redirects to login page
    │   │   ├── AuthController.java
    │   │   ├── AdminController.java
    │   │   ├── LecturerController.java
    │   │   ├── StudentController.java
    │   │   └── QuizController.java
    │   ├── dto/
    │   │   ├── LoginRequest.java
    │   │   ├── EnrollRequest.java
    │   │   ├── ExamAccessRequest.java
    │   │   └── AnswerSubmitRequest.java
    │   ├── model/
    │   │   ├── User.java
    │   │   ├── AcademicYear.java
    │   │   ├── Semester.java
    │   │   ├── Module.java                 ← lecturers is now @ManyToMany List<User>
    │   │   ├── StudentModule.java
    │   │   ├── Exam.java
    │   │   ├── Question.java
    │   │   ├── AnswerOption.java
    │   │   ├── ExamAttempt.java
    │   │   └── StudentAnswer.java
    │   ├── repository/
    │   │   ├── UserRepository.java
    │   │   ├── AcademicYearRepository.java
    │   │   ├── SemesterRepository.java
    │   │   ├── ModuleRepository.java       ← findByLecturersId()
    │   │   ├── StudentModuleRepository.java
    │   │   ├── ExamRepository.java         ← findByModuleLecturersId()
    │   │   ├── QuestionRepository.java
    │   │   ├── AnswerOptionRepository.java
    │   │   ├── ExamAttemptRepository.java
    │   │   └── StudentAnswerRepository.java
    │   └── service/
    │       ├── UserService.java
    │       ├── AdminService.java
    │       ├── LecturerService.java
    │       ├── StudentService.java
    │       └── QuizService.java
    └── resources/
        ├── application.properties
        ├── data.sql                         ← optional seed data
        └── static/
            ├── css/
            │   └── styles.css
            ├── js/
            │   ├── auth.js
            │   ├── admin.js
            │   ├── lecturer.js
            │   ├── student.js
            │   └── quiz.js
            └── pages/
                ├── login.html
                ├── admin/
                │   ├── dashboard.html
                │   ├── years.html
                │   ├── semesters.html
                │   ├── modules.html
                │   └── users.html
                ├── lecturer/
                │   ├── dashboard.html
                │   ├── exams.html          ← unified Exams & Questions page (hierarchical)
                │   ├── questions.html      ← legacy page, kept for compatibility
                │   └── results.html
                └── student/
                    ├── dashboard.html
                    ├── modules.html
                    ├── exams.html
                    ├── quiz.html
                    └── results.html
```

---

## REST API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Redirect to login page |
| POST | `/api/auth/login` | Login (returns session cookie) |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/register` | Student self-registration |

### Admin (`/api/admin`) — Role: ADMIN
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/years` | List all academic years (read-only) |
| GET | `/api/admin/years/{yearId}/semesters` | List semesters for a year (read-only) |
| GET | `/api/admin/semesters/{semId}/modules` | List modules in a semester |
| POST | `/api/admin/modules` | Create module (with enrollment key) |
| PUT | `/api/admin/modules/{id}/assign-lecturer` | Add a lecturer to a module |
| PUT | `/api/admin/modules/{id}/remove-lecturer` | Remove a specific lecturer from a module |
| DELETE | `/api/admin/modules/{id}` | Delete module |
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create user (Admin/Lecturer) |
| DELETE | `/api/admin/users/{id}` | Delete user |

### Lecturer (`/api/lecturer`) — Role: LECTURER
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lecturer/modules` | Get assigned modules |
| GET | `/api/lecturer/exams` | List all exams for lecturer |
| POST | `/api/lecturer/exams` | Create exam under a module |
| PUT | `/api/lecturer/exams/{id}` | Update exam details |
| DELETE | `/api/lecturer/exams/{id}` | Delete exam |
| GET | `/api/lecturer/exams/{examId}/questions` | List questions (includes answer options) |
| POST | `/api/lecturer/exams/{examId}/questions` | Add question |
| PUT | `/api/lecturer/questions/{questionId}` | Update question (text, type, marks, options) |
| DELETE | `/api/lecturer/questions/{questionId}` | Delete question |
| GET | `/api/lecturer/exams/{examId}/attempts` | View all student attempts |
| PUT | `/api/lecturer/attempts/{attemptId}/grade` | Award marks for short answers |
| PUT | `/api/lecturer/exams/{examId}/release-results` | Release results to students |
| GET | `/api/lecturer/modules/{moduleId}/marksheet` | Generate marksheet for a module (all students × all exams) |

### Student (`/api/student`) — Role: STUDENT
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/years` | List academic years |
| GET | `/api/student/years/{yearId}/semesters` | List semesters |
| GET | `/api/student/semesters/{semId}/modules` | List modules in a semester |
| POST | `/api/student/modules/{moduleId}/enroll` | Enroll using enrollment key |
| GET | `/api/student/modules/enrolled` | Get enrolled modules |
| GET | `/api/student/modules/{moduleId}/exams` | List exams in module |
| POST | `/api/student/exams/{examId}/access` | Verify exam password → start attempt |
| GET | `/api/student/results` | View released results |

### Quiz (`/api/quiz`) — Role: STUDENT (active attempt required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quiz/{attemptId}/questions` | Get shuffled question list |
| GET | `/api/quiz/{attemptId}/question/{questionId}` | Get a specific question |
| POST | `/api/quiz/{attemptId}/answer` | Save answer for a question |
| GET | `/api/quiz/{attemptId}/status` | Get time remaining + answered count |
| POST | `/api/quiz/{attemptId}/submit` | Submit the exam |

---

## Key Business Rules

1. **Enrollment Key**: A student must enter the correct module enrollment key to join a module. Case-sensitive exact match.
2. **Exam Access Password**: A student must enter the correct exam password to start an attempt. Each student gets only one attempt per exam.
3. **Quiz Timer**: Duration is set per exam (in minutes). The backend records `start_time` on first access. The frontend polls `/api/quiz/{id}/status` every 30 seconds for remaining time. On timeout, the attempt is auto-submitted.
4. **Question Navigation Grid**: The frontend renders a grid of question numbers. Each cell shows status: unanswered (grey), answered (green), current (blue). Students can jump to any question freely.
5. **Question Shuffle**: Questions are shuffled per attempt using `Collections.shuffle()` with attempt ID as seed — consistent within a session.
6. **Auto-grading**: MCQ, True/False, Multi-select answers are auto-graded on submission. Multi-select awards marks only if ALL correct options are selected and NO incorrect options.
7. **Manual Grading**: Short Answer questions require the lecturer to manually award marks via the results dashboard.
8. **Post-submission View**: After a student submits (or the exam times out), the quiz page shows only a "Your exam has been submitted" / "Finished" confirmation message. No score, marks, or answer feedback is shown at this stage.
9. **Result Release**: Results (score, individual answers) are only visible to students after the lecturer explicitly releases them for that exam. Until released, the student's results page shows only the submission status.
10. **Marksheet**: The lecturer can generate a marksheet scoped to a module — a table of all enrolled students as rows and all exams in the module as columns, showing each student's total score (auto + manual) per exam. The marksheet is returned as JSON (or rendered as a downloadable CSV/HTML table).
11. **Multiple Lecturers per Module**: A module can have multiple lecturers assigned. Each lecturer sees only the modules they are assigned to. The `module_lecturers` join table manages this many-to-many relationship. The assign-lecturer endpoint adds without replacing; the remove-lecturer endpoint removes a specific lecturer by ID.
12. **Root Redirect**: Visiting `http://localhost:8080/` redirects to `/pages/login.html` via `RootController`.

---

## application.properties

```properties
# Server
server.port=8080

# H2 Database (file-based — data persists across restarts)
spring.datasource.url=jdbc:h2:file:./data/examdb;AUTO_SERVER=TRUE
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# JPA — 'update' adds new columns/tables without wiping existing data
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Session
server.servlet.session.timeout=60m

# Default admin credentials (change in production)
app.admin.username=admin
app.admin.password=admin123
app.admin.email=admin@examportal.com
```

---

## Maven Dependencies (pom.xml)

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## Default Seed Data (DataInitializer.java)

On startup, automatically create:
- 1 default Admin user (`admin` / `admin123`)
- Academic Years: Year 1, Year 2, Year 3, Year 4
- Semesters: Semester 1 and Semester 2 under each year

---

## Quiz UI Specification

### Quiz Page Layout (`quiz.html`)
```
┌──────────────────────────────────────────────────────┐
│  [Module Name] - [Exam Title]          ⏱ 00:45:23   │
├──────────────────────────────────────────────────────┤
│                                        NAVIGATION    │
│  Question 3 of 20                      ┌──┬──┬──┬──┐ │
│                                        │ 1│ 2│●3│ 4│ │
│  Q: What is the output of ...?         ├──┼──┼──┼──┤ │
│                                        │ 5│✓6│ 7│ 8│ │
│  ○ Option A                            ├──┼──┼──┼──┤ │
│  ○ Option B                            │ 9│10│11│12│ │
│  ● Option C  ← selected                └──┴──┴──┴──┘ │
│  ○ Option D                                          │
│                                        Legend:       │
│  [← Previous]          [Next →]        ● Current    │
│                                        ✓ Answered   │
│              [Submit Exam]             □ Unanswered  │
└──────────────────────────────────────────────────────┘
```

- Timer updates every second via `setInterval`
- Grid cell colors: grey = unanswered, green = answered, blue border = current
- Clicking any grid cell navigates to that question
- Answers are auto-saved on option click (POST to `/api/quiz/{attemptId}/answer`)
- Submit shows a confirmation dialog listing unanswered questions if any

---

## Lecturer Portal — Exams & Questions (Hierarchical View)

The lecturer portal merges Exams and Questions into a single page (`exams.html`):

```
[ CS101 – Intro to CS ]  [ CS201 – Data Structures ]   ← module tabs

┌─────────────────────────────────────────────────────────┐
│  CS101 – Introduction to CS              [+ Create Exam] │
├─────────────────────────────────────────────────────────┤
│ ▶  Midterm Exam    ACTIVE   [Edit] [Results] [Delete]   │
│ ▼  Final Exam      DRAFT    [Edit] [Results] [Delete]   │
│    3 questions · 15 total marks        [+ Add Question]  │
│    1  What is a variable?  MCQ  2  [Edit] [Delete]      │
│    2  Explain recursion    SHORT_ANSWER  5  [Edit] [Delete] │
│    3  True/False: ...      TRUE_FALSE  1  [Edit] [Delete] │
└─────────────────────────────────────────────────────────┘
```

- Module tabs at the top — one per assigned module
- Each exam is an accordion card: click header to expand/collapse
- Questions load lazily on first expand, then cached
- Edit button on each question pre-populates the modal (text, type, marks, answer options)

---

## Group Workload Distribution

### Member 1 — Project Lead / Core Setup & Authentication
**Deliverables:**
- Spring Boot project scaffolding (pom.xml, package structure)
- H2 database configuration and `application.properties`
- All JPA Entity classes (`User`, `AcademicYear`, `Semester`, `Module`, `Exam`, `Question`, `AnswerOption`, `ExamAttempt`, `StudentAnswer`)
- All Repository interfaces
- Spring Security configuration (session-based login, role-based route protection)
- `RootController` — `GET /` redirect to login page
- `AuthController` — login, logout, register
- `DataInitializer` — seed default admin + years + semesters
- Login page (`login.html`, `auth.js`)

### Member 2 — Admin Module
**Deliverables:**
- `AdminService` — module CRUD, user management, multi-lecturer assign/remove
- `AdminController` — all `/api/admin/**` endpoints including assign-lecturer and remove-lecturer
- Admin dashboard UI (`admin/dashboard.html`, `admin/years.html`, `admin/semesters.html`, `admin/modules.html`, `admin/users.html`)
- `admin.js` — fetch calls to admin API endpoints, dynamic table rendering, remove-lecturer modal
- Shared `styles.css` base layout

### Member 3 — Lecturer Module
**Deliverables:**
- `LecturerService` — exam CRUD, question add/edit/delete, result release, short-answer grading, marksheet generation per module
- `LecturerController` — all `/api/lecturer/**` endpoints including `GET /api/lecturer/modules/{moduleId}/marksheet`
- Lecturer dashboard UI (`lecturer/dashboard.html`, `lecturer/exams.html`, `lecturer/results.html`)
- `lecturer.js` — hierarchical module-tab → exam-accordion → inline question view; exam create/edit modal; question add/edit modal with type-switching (MCQ/T-F/Multi/Short); results view and grading form; marksheet download/render

### Member 4 — Student Module
**Deliverables:**
- `StudentService` — browse years/semesters/modules, enrollment logic, exam access validation
- `StudentController` — all `/api/student/**` endpoints
- Student dashboard UI (`student/dashboard.html`, `student/modules.html`, `student/exams.html`, `student/results.html`)
- `student.js` — year/semester/module navigation, enrollment key modal, exam password modal, results display

### Member 5 — Quiz Engine & Results
**Deliverables:**
- `QuizService` — shuffle questions (seeded by attempt ID), save answers, auto-grade MCQ/T-F/Multi-select, handle timeout/submission, compute scores
- `QuizController` — all `/api/quiz/**` endpoints
- Quiz page UI (`student/quiz.html`)
- `quiz.js` — countdown timer, question navigation grid, answer selection + auto-save, submit with confirmation, question status tracking
- On submission (manual or timeout): display only "Exam Submitted / Finished" confirmation — **do not show score or marks** to the student

---

## Development Workflow

1. **Member 1** sets up the project and pushes the base skeleton (entities + repos + security) first — all other members depend on this.
2. **Members 2, 3, 4** can develop their modules in parallel once the base is ready.
3. **Member 5** starts the quiz engine once Member 3 has the exam/question models confirmed.
4. Integration testing: run the app locally (`mvn spring-boot:run`), access H2 console at `http://localhost:8080/h2-console`.

## Git Branch Strategy
```
main            ← stable, working builds only
dev             ← integration branch
feature/auth    ← Member 1
feature/admin   ← Member 2
feature/lecturer ← Member 3
feature/student ← Member 4
feature/quiz    ← Member 5
```

## Running the Application
```bash
# Clone and build
mvn clean install

# Run
mvn spring-boot:run

# Access
App:        http://localhost:8080  (redirects to login automatically)
H2 Console: http://localhost:8080/h2-console
            JDBC URL: jdbc:h2:file:./data/examdb
```

## Testing Checklist
- [ ] Visiting http://localhost:8080 redirects to the login page
- [ ] Admin can create Module under a Semester → assign multiple Lecturers → remove individual Lecturers
- [ ] Student can register, browse structure, enroll with correct key
- [ ] Student is rejected with wrong enrollment key
- [ ] Lecturer dashboard My Modules table shows Academic Year, Semester, and Module Code
- [ ] Lecturer sees only modules they are assigned to
- [ ] Lecturer can create exam — module tabs and accordion render correctly
- [ ] Lecturer can add, edit, and delete questions of all 4 types within the accordion
- [ ] Edit question modal pre-populates all fields including answer options
- [ ] Student can access exam with correct password
- [ ] Quiz timer counts down correctly; auto-submits on timeout
- [ ] Navigation grid reflects answered/unanswered state
- [ ] MCQ/True-False auto-grading is correct
- [ ] Multi-select only awards marks when all correct + no wrong options selected
- [ ] Short answer results show in lecturer's grading view
- [ ] After exam submission student sees only "Submitted / Finished" — no score or marks displayed
- [ ] Results are hidden from student until lecturer releases them
- [ ] Results are visible after lecturer releases them
- [ ] Lecturer can generate a marksheet for a module showing all students' scores across all exams
