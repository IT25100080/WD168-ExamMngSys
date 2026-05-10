package com.wd168.ExamMngSys.controller;

import com.wd168.ExamMngSys.dto.LoginRequest;
import com.wd168.ExamMngSys.model.PasswordResetRequest;
import com.wd168.ExamMngSys.model.User;
import com.wd168.ExamMngSys.repository.PasswordResetRequestRepository;
import com.wd168.ExamMngSys.repository.UserRepository;
import com.wd168.ExamMngSys.service.EmailService;
import com.wd168.ExamMngSys.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final EmailService emailService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

        User user = userService.findByUsername(request.getUsername());
        return ResponseEntity.ok(Map.of(
            "id", user.getId(),
            "username", user.getUsername(),
            "fullName", user.getFullName() != null ? user.getFullName() : "",
            "role", user.getRole().name()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username or email is required"));
        }
        User user = userRepository.findByUsername(identifier)
            .orElseGet(() -> userRepository.findByEmail(identifier).orElse(null));

        if (user == null || user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(Map.of("message", "If your account exists, your request has been submitted. Please contact an administrator."));
        }
        if (passwordResetRequestRepository.findByUserIdAndStatus(user.getId(), PasswordResetRequest.Status.PENDING).isPresent()) {
            return ResponseEntity.ok(Map.of("message", "A reset request is already pending for your account. Please contact an administrator."));
        }
        PasswordResetRequest req = new PasswordResetRequest();
        req.setUser(user);
        passwordResetRequestRepository.save(req);
        emailService.sendResetRequestConfirmation(user.getEmail(), user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Request submitted. Please contact an administrator to receive your new password."));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email = body.get("email");
        String password = body.get("password");
        String fullName = body.get("fullName");

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));
        }
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        User user = new User();
        user.setFullName(fullName);
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(User.Role.STUDENT);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Registration successful"));
    }
}
