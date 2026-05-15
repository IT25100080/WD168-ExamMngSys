package com.wd168.ExamMngSys.controller;
// This is a student controller
import com.wd168.ExamMngSys.dto.EnrollRequest;
import com.wd168.ExamMngSys.dto.ExamAccessRequest;
import com.wd168.ExamMngSys.service.AnnouncementService;
import com.wd168.ExamMngSys.service.StudentService;
import com.wd168.ExamMngSys.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final UserService userService;
    private final AnnouncementService announcementService;

    @GetMapping("/years")
    public ResponseEntity<?> getYears() {
        return ResponseEntity.ok(studentService.getAllYears());
    }

    @GetMapping("/years/{yearId}/semesters")
    public ResponseEntity<?> getSemesters(@PathVariable Long yearId) {
        return ResponseEntity.ok(studentService.getSemestersByYear(yearId));
    }

    @GetMapping("/semesters/{semId}/modules")
    public ResponseEntity<?> getModules(@PathVariable Long semId) {
        return ResponseEntity.ok(studentService.getModulesBySemester(semId));
    }

    @PostMapping("/modules/{moduleId}/enroll")
    public ResponseEntity<?> enroll(@PathVariable Long moduleId,
                                     @Valid @RequestBody EnrollRequest request,
                                     Authentication auth) {
        return ResponseEntity.ok(studentService.enroll(getStudentId(auth), moduleId, request.getEnrollmentKey()));
    }

    @GetMapping("/modules/enrolled")
    public ResponseEntity<?> getEnrolledModules(Authentication auth) {
        return ResponseEntity.ok(studentService.getEnrolledModules(getStudentId(auth)));
    }

    @GetMapping("/modules/{moduleId}/exams")
    public ResponseEntity<?> getExams(@PathVariable Long moduleId, Authentication auth) {
        return ResponseEntity.ok(studentService.getExamsForModule(moduleId, getStudentId(auth)));
    }

    @PostMapping("/exams/{examId}/access")
    public ResponseEntity<?> accessExam(@PathVariable Long examId,
                                         @Valid @RequestBody ExamAccessRequest request,
                                         Authentication auth) {
        return ResponseEntity.ok(studentService.accessExam(examId, getStudentId(auth), request.getPassword()));
    }

    @GetMapping("/results")
    public ResponseEntity<?> getResults(Authentication auth) {
        return ResponseEntity.ok(studentService.getReleasedResults(getStudentId(auth)));
    }

    @GetMapping("/concerns")
    public ResponseEntity<?> getConcerns(Authentication auth) {
        return ResponseEntity.ok(studentService.getStudentConcerns(getStudentId(auth)));
    }

    @PostMapping("/concerns")
    public ResponseEntity<?> submitConcern(@RequestBody java.util.Map<String, Object> body, Authentication auth) {
        Long examId = Long.valueOf(body.get("examId").toString());
        String subject = body.get("subject").toString();
        String message = body.get("message").toString();
        return ResponseEntity.ok(studentService.submitConcern(getStudentId(auth), examId, subject, message));
    }

    @GetMapping("/announcements")
    public ResponseEntity<?> getAnnouncements(Authentication auth) {
        return ResponseEntity.ok(announcementService.getStudentAnnouncements(getStudentId(auth)));
    }

    @GetMapping("/announcements/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        return ResponseEntity.ok(Map.of("count", announcementService.getUnreadCount(getStudentId(auth))));
    }

    @PostMapping("/announcements/mark-read")
    public ResponseEntity<?> markRead(@RequestBody Map<String, Object> body, Authentication auth) {
        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("ids");
        List<Long> ids = rawIds.stream().map(i -> i.longValue()).collect(java.util.stream.Collectors.toList());
        announcementService.markRead(getStudentId(auth), ids);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    private Long getStudentId(Authentication auth) {
        return userService.findByUsername(auth.getName()).getId();
    }
}
