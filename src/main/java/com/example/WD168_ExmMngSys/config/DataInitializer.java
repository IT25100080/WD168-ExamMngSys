package com.example.WD168_ExmMngSys.config;

import com.wd168.ExamMngSys.model.AcademicYear;
import com.wd168.ExamMngSys.model.Semester;
import com.wd168.ExamMngSys.model.User;
import com.wd168.ExamMngSys.repository.AcademicYearRepository;
import com.wd168.ExamMngSys.repository.SemesterRepository;
import com.wd168.ExamMngSys.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AcademicYearRepository academicYearRepository;
    private final SemesterRepository semesterRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.email:admin@examportal.com}")
    private String adminEmail;

    @Override
    public void run(String... args) {
        seedAdmin();
        seedAcademicStructure();
    }

    private void seedAdmin() {
        if (!userRepository.existsByUsername(adminUsername)) {
            User admin = new User();
            admin.setFullName("System Administrator");
            admin.setUsername(adminUsername);
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole(User.Role.ADMIN);
            userRepository.save(admin);
        }
    }

    private void seedAcademicStructure() {
        if (academicYearRepository.count() > 0) return;

        for (int y = 1; y <= 4; y++) {
            AcademicYear year = new AcademicYear();
            year.setName("Year " + y);
            year.setDisplayOrder(y);
            academicYearRepository.save(year);

            for (int s = 1; s <= 2; s++) {
                Semester semester = new Semester();
                semester.setAcademicYear(year);
                semester.setName("Semester " + s);
                semester.setDisplayOrder(s);
                semesterRepository.save(semester);
            }
        }
    }
}
