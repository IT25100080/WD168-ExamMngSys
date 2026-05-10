package com.wd168.ExamMngSys.controller;

import com.wd168.ExamMngSys.model.User;
import com.wd168.ExamMngSys.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> body, Authentication authentication) {
        String currentPassword = (String) body.get("currentPassword");
        String newPassword = (String) body.get("newPassword");

        if (currentPassword == null || currentPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is required"));
        }
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password is required"));
        }

        User user = userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PutMapping("/force-change-password")
    public ResponseEntity<?> forceChangePassword(@RequestBody Map<String, Object> body, Authentication authentication) {
        String newPassword = (String) body.get("newPassword");
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password is required"));
        }
        User user = userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!Boolean.TRUE.equals(user.getPasswordResetRequired())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "No forced password change required"));
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetRequired(false);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}
