package com.wd168.ExamMngSys.controller;

import com.wd168.ExamMngSys.model.Exam;
import com.wd168.ExamMngSys.model.Module;
import com.wd168.ExamMngSys.model.Question;
import com.wd168.ExamMngSys.service.LecturerService;
import com.wd168.ExamMngSys.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lecturer")
@RequiredArgsConstructor
public class LecturerController {

    private final LecturerService lecturerService;
    private final UserService userService;

    @GetMapping("/modules")
    public ResponseEntity<?> getModules(Authentication auth) {
        return ResponseEntity.ok(lecturerService.getAssignedModules(getLecturerId(auth)));
    }

    @GetMapping("/exams")
    public ResponseEntity<?> getExams(Authentication auth) {
        return ResponseEntity.ok(lecturerService.getExamsForLecturer(getLecturerId(auth)));
    }

    @PostMapping("/exams")
    public ResponseEntity<?> createExam(@RequestBody Map<String, Object> body, Authentication auth) {
        Long moduleId = Long.valueOf(body.get("moduleId").toString());
        String title = (String) body.get("title");
        String description = (String) body.get("description");
        int duration = ((Number) body.get("durationMinutes")).intValue();
        String password = (String) body.get("accessPassword");
        LocalDateTime start = body.get("startTime") != null ? LocalDateTime.parse((String) body.get("startTime")) : null;
        LocalDateTime end = body.get("endTime") != null ? LocalDateTime.parse((String) body.get("endTime")) : null;
        Exam.Status status = body.get("status") != null ? Exam.Status.valueOf((String) body.get("status")) : null;
        int maxAttempts = body.get("maxAttempts") != null ? ((Number) body.get("maxAttempts")).intValue() : 1;
        return ResponseEntity.ok(lecturerService.createExam(moduleId, getLecturerId(auth), title, description, duration, password, start, end, status, maxAttempts));
    }

    @PutMapping("/exams/{id}")
    public ResponseEntity<?> updateExam(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        String title = (String) body.get("title");
        String description = (String) body.get("description");
        int duration = ((Number) body.get("durationMinutes")).intValue();
        String password = (String) body.get("accessPassword");
        LocalDateTime start = body.get("startTime") != null ? LocalDateTime.parse((String) body.get("startTime")) : null;
        LocalDateTime end = body.get("endTime") != null ? LocalDateTime.parse((String) body.get("endTime")) : null;
        Exam.Status status = Exam.Status.valueOf((String) body.get("status"));
        int maxAttempts = body.get("maxAttempts") != null ? ((Number) body.get("maxAttempts")).intValue() : 1;
        return ResponseEntity.ok(lecturerService.updateExam(id, getLecturerId(auth), title, description, duration, password, start, end, status, maxAttempts));
    }

    @DeleteMapping("/exams/{id}")
    public ResponseEntity<?> deleteExam(@PathVariable Long id, Authentication auth) {
        lecturerService.deleteExam(id, getLecturerId(auth));
        return ResponseEntity.ok(Map.of("message", "Exam deleted"));
    }

    @GetMapping("/exams/{examId}/questions")
    public ResponseEntity<?> getQuestions(@PathVariable Long examId, Authentication auth) {
        return ResponseEntity.ok(lecturerService.getQuestions(examId, getLecturerId(auth)));
    }

    @PostMapping("/exams/{examId}/questions")
    public ResponseEntity<?> addQuestion(@PathVariable Long examId, @RequestBody Map<String, Object> body, Authentication auth) {
        String text = (String) body.get("questionText");
        Question.QuestionType type = Question.QuestionType.valueOf((String) body.get("questionType"));
        int marks = ((Number) body.get("marks")).intValue();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> options = (List<Map<String, Object>>) body.get("options");
        return ResponseEntity.ok(lecturerService.addQuestion(examId, getLecturerId(auth), text, type, marks, options));
    }

    @PutMapping("/questions/{questionId}")
    public ResponseEntity<?> updateQuestion(@PathVariable Long questionId, @RequestBody Map<String, Object> body, Authentication auth) {
        String text = (String) body.get("questionText");
        Question.QuestionType type = Question.QuestionType.valueOf((String) body.get("questionType"));
        int marks = ((Number) body.get("marks")).intValue();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> options = (List<Map<String, Object>>) body.get("options");
        return ResponseEntity.ok(lecturerService.updateQuestion(questionId, getLecturerId(auth), text, type, marks, options));
    }

    @DeleteMapping("/questions/{questionId}")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long questionId, Authentication auth) {
        lecturerService.deleteQuestion(questionId, getLecturerId(auth));
        return ResponseEntity.ok(Map.of("message", "Question deleted"));
    }

    @GetMapping("/exams/{examId}/attempts")
    public ResponseEntity<?> getAttempts(@PathVariable Long examId, Authentication auth) {
        return ResponseEntity.ok(lecturerService.getAttempts(examId, getLecturerId(auth)));
    }

    @GetMapping("/attempts/{attemptId}/answers")
    public ResponseEntity<?> getAttemptAnswers(@PathVariable Long attemptId, Authentication auth) {
        return ResponseEntity.ok(lecturerService.getAttemptAnswers(attemptId, getLecturerId(auth)));
    }

    @PutMapping("/attempts/{attemptId}/grade")
    public ResponseEntity<?> grade(@PathVariable Long attemptId, @RequestBody Map<String, Object> body, Authentication auth) {
        Long questionId = Long.valueOf(body.get("questionId").toString());
        int marks = ((Number) body.get("marks")).intValue();
        lecturerService.gradeShortAnswer(attemptId, questionId, marks, getLecturerId(auth));
        return ResponseEntity.ok(Map.of("message", "Graded"));
    }

    @PutMapping("/exams/{examId}/release-results")
    public ResponseEntity<?> releaseResults(@PathVariable Long examId, Authentication auth) {
        return ResponseEntity.ok(lecturerService.releaseResults(examId, getLecturerId(auth)));
    }

    @PutMapping("/exams/{examId}/revise-results")
    public ResponseEntity<?> reviseResults(@PathVariable Long examId, Authentication auth) {
        return ResponseEntity.ok(lecturerService.reviseResults(examId, getLecturerId(auth)));
    }

    @DeleteMapping("/attempts/{attemptId}")
    public ResponseEntity<?> deleteAttempt(@PathVariable Long attemptId, Authentication auth) {
        lecturerService.deleteAttempt(attemptId, getLecturerId(auth));
        return ResponseEntity.ok(Map.of("message", "Attempt deleted"));
    }

    private Long getLecturerId(Authentication auth) {
        return userService.findByUsername(auth.getName()).getId();
    }
}
