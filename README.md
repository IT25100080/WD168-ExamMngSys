<div align="center">

# 🎓 Online Examination & Result Management System

**A full-stack web application for managing academic exams end-to-end**

[![Java](https://img.shields.io/badge/Java-17+-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=spring-security&logoColor=white)](https://spring.io/projects/spring-security)
[![H2 Database](https://img.shields.io/badge/H2_Database-File--based-1A56AA?style=for-the-badge&logo=databricks&logoColor=white)](https://www.h2database.com/)
[![Maven](https://img.shields.io/badge/Maven-C71A36?style=for-the-badge&logo=apache-maven&logoColor=white)](https://maven.apache.org/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Roles](#-system-roles)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Team](#-team)

---

## 🔍 Overview

The **Online Examination and Result Management System** is a web-based platform that covers the full academic exam lifecycle — from module setup and exam creation through to student quiz delivery, auto-grading, and result release. It supports three distinct user roles with dedicated dashboards and enforces strict access control throughout.

> Built as a group project for module **WD168**, using Spring Boot on the backend and plain HTML5 + Vanilla JavaScript on the frontend.

---

## ✨ Features

### 🛡️ Administrator
| Feature | Description |
|---|---|
| Module Management | Create modules with unique enrollment keys under any semester |
| Multi-Lecturer Assignment | Assign or remove individual lecturers per module |
| User Management | Create Lecturer / Admin accounts; reset passwords |
| Announcements | Post global or module-scoped announcements |
| Submissions Overview | View all exam attempts across the system |

### 👨‍🏫 Lecturer
| Feature | Description |
|---|---|
| Exam CRUD | Create, edit, delete exams with access password and time window |
| Question Management | Add MCQ, True/False, Multi-select, and Short Answer questions with image support |
| Results & Grading | View student attempts; manually grade short-answer questions |
| Result Release | Release results to students when ready |
| Marksheet | Download a student × exam score matrix for any module |
| Announcements | Post module-scoped announcements; reply to student concerns |

### 👩‍🎓 Student
| Feature | Description |
|---|---|
| Module Enrollment | Browse academic structure and enroll using an enrollment key |
| Exam Access | Enter exam password to start a timed attempt |
| Live Quiz | Answer questions with a countdown timer and navigation grid |
| Results | View scores and answers after the lecturer releases results |
| Concerns | Raise exam-related concerns and receive lecturer replies |
| Announcements | View global and module-level announcements with unread badges |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Spring Boot 3.x (Java 17+) |
| **Security** | Spring Security — session-based authentication, role-based access control |
| **Database** | H2 (file-based, persistent across restarts) |
| **ORM** | Spring Data JPA / Hibernate |
| **Frontend** | Plain HTML5 + CSS3 + Vanilla JavaScript |
| **Build Tool** | Apache Maven |
| **Server** | Embedded Apache Tomcat |

---

## 👥 System Roles

```
┌─────────────────────────────────────────────────────────────┐
│                        System Users                         │
├───────────────┬─────────────────┬───────────────────────────┤
│  ADMIN        │  LECTURER       │  STUDENT                  │
│               │                 │                           │
│  • Modules    │  • Exams        │  • Self-register          │
│  • Users      │  • Questions    │  • Enroll modules         │
│  • Announce   │  • Grading      │  • Take quizzes           │
│  • Submissions│  • Results      │  • View results           │
│               │  • Concerns     │  • Raise concerns         │
└───────────────┴─────────────────┴───────────────────────────┘
```

---

## 📁 Project Structure

```
src/
└── main/
    ├── java/com/wd168/ExamMngSys/
    │   ├── config/
    │   │   ├── SecurityConfig.java         ← Role-based URL protection
    │   │   ├── DataInitializer.java        ← Seeds admin + academic structure
    │   │   └── WebConfig.java              ← Serves uploaded question images
    │   ├── controller/
    │   │   ├── AuthController.java         ← Login, logout, register, forgot-password
    │   │   ├── AdminController.java        ← /api/admin/**
    │   │   ├── LecturerController.java     ← /api/lecturer/**
    │   │   ├── StudentController.java      ← /api/student/**
    │   │   ├── QuizController.java         ← /api/quiz/**
    │   │   └── UserController.java         ← /api/user/** (change-password)
    │   ├── model/                          ← JPA entities
    │   ├── repository/                     ← Spring Data JPA interfaces
    │   └── service/                        ← Business logic layer
    └── resources/
        ├── application.properties
        └── static/
            ├── css/styles.css
            ├── js/
            │   ├── auth.js      ├── admin.js
            │   ├── lecturer.js  ├── student.js
            │   └── quiz.js
            └── pages/
                ├── login.html
                ├── admin/       ← dashboard, years, semesters, modules, users, announcements
                ├── lecturer/    ← dashboard, exams, results, announcements, concerns
                └── student/     ← dashboard, modules, exams, quiz, results, announcements, concerns
```

---

## 🗄️ Database Schema

```
academic_years ──< semesters ──< modules >──< module_lecturers >── users
                                    │
                                    └──< exams ──< questions ──< answer_options
                                                       │
                              student_modules          └──< student_answers
                                    │                         │
                               users (students)        exam_attempts ── users (students)

announcements ──< announcement_reads ── users
concerns ── users (students) ── exams
password_reset_requests ── users
```

---

## 📡 API Endpoints

<details>
<summary><b>🔐 Auth  <code>/api/auth</code></b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login — returns session cookie + role |
| `POST` | `/api/auth/logout` | Invalidate session |
| `POST` | `/api/auth/register` | Student self-registration |
| `POST` | `/api/auth/forgot-password` | Trigger password reset email |

</details>

<details>
<summary><b>🛡️ Admin  <code>/api/admin</code>  — Role: ADMIN</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/years` | List all academic years |
| `GET` | `/api/admin/years/{yearId}/semesters` | List semesters |
| `GET` | `/api/admin/semesters/{semId}/modules` | List modules |
| `POST` | `/api/admin/modules` | Create module |
| `DELETE` | `/api/admin/modules/{id}` | Delete module |
| `PUT` | `/api/admin/modules/{id}/assign-lecturer` | Assign lecturer |
| `PUT` | `/api/admin/modules/{id}/remove-lecturer` | Remove lecturer |
| `GET` | `/api/admin/users` | List all users |
| `POST` | `/api/admin/users` | Create user |
| `DELETE` | `/api/admin/users/{id}` | Delete user |

</details>

<details>
<summary><b>👨‍🏫 Lecturer  <code>/api/lecturer</code>  — Role: LECTURER</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lecturer/modules` | Get assigned modules |
| `GET` | `/api/lecturer/exams` | List exams |
| `POST` | `/api/lecturer/exams` | Create exam |
| `PUT` | `/api/lecturer/exams/{id}` | Update exam |
| `DELETE` | `/api/lecturer/exams/{id}` | Delete exam |
| `GET` | `/api/lecturer/exams/{examId}/questions` | List questions |
| `POST` | `/api/lecturer/exams/{examId}/questions` | Add question |
| `PUT` | `/api/lecturer/questions/{questionId}` | Update question |
| `DELETE` | `/api/lecturer/questions/{questionId}` | Delete question |
| `GET` | `/api/lecturer/exams/{examId}/attempts` | View attempts |
| `PUT` | `/api/lecturer/attempts/{attemptId}/grade` | Grade short answer |
| `PUT` | `/api/lecturer/exams/{examId}/release-results` | Release results |
| `GET` | `/api/lecturer/modules/{moduleId}/marksheet` | Generate marksheet |

</details>

<details>
<summary><b>👩‍🎓 Student  <code>/api/student</code>  — Role: STUDENT</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/student/years` | Browse academic years |
| `GET` | `/api/student/semesters/{semId}/modules` | Browse modules |
| `POST` | `/api/student/modules/{id}/enroll` | Enroll with key |
| `GET` | `/api/student/modules/enrolled` | My modules |
| `POST` | `/api/student/exams/{examId}/access` | Start exam attempt |
| `GET` | `/api/student/results` | View released results |

</details>

<details>
<summary><b>🎯 Quiz  <code>/api/quiz</code>  — Role: STUDENT</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/quiz/{attemptId}/questions` | Shuffled questions |
| `POST` | `/api/quiz/{attemptId}/answer` | Save answer |
| `GET` | `/api/quiz/{attemptId}/status` | Time remaining |
| `POST` | `/api/quiz/{attemptId}/submit` | Submit exam |

</details>

---

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Apache Maven 3.8+

### Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/IT25100080/WD168-ExamMngSys.git
cd WD168-ExamMngSys

# 2. Build
mvn clean install

# 3. Run
mvn spring-boot:run
```

### Access

| URL | Description |
|-----|-------------|
| `http://localhost:8080` | Application (redirects to login) |

### Default Admin Credentials

```
Username : admin
Password : admin123
```

> ⚠️ Change the admin password immediately after first login in a production environment.

---

## ⚙️ Key Configuration  (`application.properties`)

```properties
server.port=8080

# Session timeout
server.servlet.session.timeout=60m

# Default admin (override in production)
app.admin.username=admin
app.admin.password=admin123
app.admin.email=admin@examportal.com
```

---

## 🔑 Key Business Rules

- **Enrollment Key** — Case-sensitive exact match required to join a module
- **Exam Password** — Required to start an attempt; one attempt per student per exam
- **Quiz Timer** — Auto-submits when time runs out; backend enforces the deadline
- **Question Shuffle** — Questions shuffled per attempt using `attemptId` as the random seed (consistent within a session)
- **Auto-grading** — MCQ, True/False, and Multi-select are graded on submission; Short Answer requires manual grading
- **Multi-select Rule** — Full marks only if ALL correct options are selected and NO incorrect options are selected
- **Result Release** — Student scores are hidden until the lecturer explicitly releases results

---

## 👨‍💻 Team

| Member | Role |
|--------|------|
| **Rodrigo K Y S** | Admin Module — Create Module, Create Lecturer, Assign Lecturer to Module |
| **Jayarathne H M P K** | Lecturer Module — Create Exams, Release Exam Marks |
| **Liharsan R** | Quiz Module — Question Management & Live Quiz Engine |
| **Ravihara L D C** | Student Module — Registration, Enrollment, Quiz Access & Results |
| **Ranaweera D A I M** | Communication Module — Concerns & Announcements |

---

<div align="center">

**WD168 — Online Examination and Result Management System**

*Built with Spring Boot · H2 · Vanilla JavaScript*

</div>
