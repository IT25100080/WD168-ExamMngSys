package com.wd168.ExamMngSys.service;

import com.wd168.ExamMngSys.model.AcademicYear;
import com.wd168.ExamMngSys.model.ExamAttempt;
import com.wd168.ExamMngSys.model.Module;
import com.wd168.ExamMngSys.model.Semester;
import com.wd168.ExamMngSys.model.StudentModule;
import com.wd168.ExamMngSys.model.User;
import com.wd168.ExamMngSys.repository.AcademicYearRepository;
import com.wd168.ExamMngSys.repository.ExamAttemptRepository;
import com.wd168.ExamMngSys.repository.ModuleRepository;
import com.wd168.ExamMngSys.repository.SemesterRepository;
import com.wd168.ExamMngSys.repository.StudentAnswerRepository;
import com.wd168.ExamMngSys.repository.StudentModuleRepository;
import com.wd168.ExamMngSys.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;


@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final AcademicYearRepository academicYearRepository;
    private final SemesterRepository semesterRepository;
    private final ModuleRepository moduleRepository;
    private final StudentModuleRepository studentModuleRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final PasswordEncoder passwordEncoder;

    public List<AcademicYear> getAllYears() {
        return academicYearRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<Semester> getSemestersByYear(Long yearId) {
        return semesterRepository.findByAcademicYearIdOrderByDisplayOrderAsc(yearId);
    }

    public List<Module> getModulesBySemester(Long semId) {
        return moduleRepository.findBySemesterId(semId);
    }

    public Module createModule(Long semesterId, String name, String moduleCode, String description, String enrollmentKey) {
        Semester semester = semesterRepository.findById(semesterId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Semester not found"));
        if (moduleRepository.existsByModuleCode(moduleCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Module code already exists");
        }
        Module module = new Module();
        module.setSemester(semester);
        module.setName(name);
        module.setModuleCode(moduleCode);
        module.setDescription(description);
        module.setEnrollmentKey(enrollmentKey);
        return moduleRepository.save(module);
    }

    public void deleteModule(Long id) {
        moduleRepository.deleteById(id);
    }

    public Module assignLecturer(Long moduleId, Long lecturerId) {
        Module module = moduleRepository.findById(moduleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        User lecturer = userRepository.findById(lecturerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (lecturer.getRole() != User.Role.LECTURER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not a lecturer");
        }
        if (!module.getLecturers().contains(lecturer)) {
            module.getLecturers().add(lecturer);
        }
        return moduleRepository.save(module);
    }

    public Module removeLecturer(Long moduleId, Long lecturerId) {
        Module module = moduleRepository.findById(moduleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        module.getLecturers().removeIf(l -> l.getId().equals(lecturerId));
        return moduleRepository.save(module);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User createUser(String fullName, String username, String email, String password, User.Role role) {
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        User user = new User();
        user.setFullName(fullName);
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User target = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (target.getRole() == User.Role.LECTURER) {
            // Remove this lecturer from every module they are assigned to
            List<Module> assigned = moduleRepository.findByLecturersId(id);
            for (Module m : assigned) {
                m.getLecturers().removeIf(l -> l.getId().equals(id));
                moduleRepository.save(m);
            }
        } else if (target.getRole() == User.Role.STUDENT) {
            // Delete student answers → attempts → enrollments (in FK order)
            List<ExamAttempt> attempts = examAttemptRepository.findByStudentId(id);
            for (ExamAttempt attempt : attempts) {
                studentAnswerRepository.deleteByAttemptId(attempt.getId());
            }
            examAttemptRepository.deleteAll(attempts);
            studentModuleRepository.deleteAll(studentModuleRepository.findByStudentId(id));
        }

        userRepository.deleteById(id);
    }

    public void resetUserPassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getRole() == User.Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot reset admin passwords");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public List<StudentModule> getStudentEnrollments(Long studentId) {
        return studentModuleRepository.findByStudentId(studentId);
    }

    public void unenrollStudent(Long studentId, Long moduleId) {
        studentModuleRepository.findByStudentIdAndModuleId(studentId, moduleId)
            .ifPresent(studentModuleRepository::delete);
    }
}
