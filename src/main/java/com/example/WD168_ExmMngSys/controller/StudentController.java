package com.example.WD168_ExmMngSys.controller;

import com.wd168.ExamMngSys.dto.EnrollRequest;
import com.wd168.ExamMngSys.dto.ExamAccessRequest;
import com.wd168.ExamMngSys.service.StudentService;
import com.wd168.ExamMngSys.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final UserService userService;

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

    private Long getStudentId(Authentication auth) {
        return userService.findByUsername(auth.getName()).getId();
    }
}
