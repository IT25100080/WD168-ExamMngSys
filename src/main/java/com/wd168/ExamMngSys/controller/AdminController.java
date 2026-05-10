package com.wd168.ExamMngSys.controller;

import com.wd168.ExamMngSys.model.User;
import com.wd168.ExamMngSys.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/years")
    public ResponseEntity<?> getYears() {
        return ResponseEntity.ok(adminService.getAllYears());
    }

    @GetMapping("/years/{yearId}/semesters")
    public ResponseEntity<?> getSemesters(@PathVariable Long yearId) {
        return ResponseEntity.ok(adminService.getSemestersByYear(yearId));
    }

    @GetMapping("/semesters/{semId}/modules")
    public ResponseEntity<?> getModules(@PathVariable Long semId) {
        return ResponseEntity.ok(adminService.getModulesBySemester(semId));
    }

    @PostMapping("/modules")
    public ResponseEntity<?> createModule(@RequestBody Map<String, Object> body) {
        Long semesterId = Long.valueOf(body.get("semesterId").toString());
        String name = (String) body.get("name");
        String code = (String) body.get("moduleCode");
        String desc = (String) body.get("description");
        String key = (String) body.get("enrollmentKey");
        return ResponseEntity.ok(adminService.createModule(semesterId, name, code, desc, key));
    }

    @DeleteMapping("/modules/{id}")
    public ResponseEntity<?> deleteModule(@PathVariable Long id) {
        adminService.deleteModule(id);
        return ResponseEntity.ok(Map.of("message", "Module deleted"));
    }

    @PutMapping("/modules/{id}/remove-lecturer")
    public ResponseEntity<?> removeLecturer(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long lecturerId = Long.valueOf(body.get("lecturerId").toString());
        return ResponseEntity.ok(adminService.removeLecturer(id, lecturerId));
    }

    @PutMapping("/modules/{id}/assign-lecturer")
    public ResponseEntity<?> assignLecturer(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long lecturerId = Long.valueOf(body.get("lecturerId").toString());
        return ResponseEntity.ok(adminService.assignLecturer(id, lecturerId));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> body) {
        String fullName = (String) body.get("fullName");
        String username = (String) body.get("username");
        String email = (String) body.get("email");
        String password = (String) body.get("password");
        User.Role role = User.Role.valueOf((String) body.get("role"));
        return ResponseEntity.ok(adminService.createUser(fullName, username, email, password, role));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    @PutMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetUserPassword(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String newPassword = (String) body.get("newPassword");
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password is required"));
        }
        adminService.resetUserPassword(id, newPassword);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @GetMapping("/students/{studentId}/enrollments")
    public ResponseEntity<?> getStudentEnrollments(@PathVariable Long studentId) {
        return ResponseEntity.ok(adminService.getStudentEnrollments(studentId));
    }

    @DeleteMapping("/students/{studentId}/enrollments/{moduleId}")
    public ResponseEntity<?> unenrollStudent(@PathVariable Long studentId, @PathVariable Long moduleId) {
        adminService.unenrollStudent(studentId, moduleId);
        return ResponseEntity.ok(Map.of("message", "Student unenrolled"));
    }
}
