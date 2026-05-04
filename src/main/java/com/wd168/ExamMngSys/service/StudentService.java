package com.wd168.ExamMngSys.service;

import com.wd168.ExamMngSys.model.AcademicYear;
import com.wd168.ExamMngSys.model.Exam;
import com.wd168.ExamMngSys.model.ExamAttempt;
import com.wd168.ExamMngSys.model.Module;
import com.wd168.ExamMngSys.model.Semester;
import com.wd168.ExamMngSys.model.StudentModule;
import com.wd168.ExamMngSys.model.User;
import com.wd168.ExamMngSys.repository.AcademicYearRepository;
import com.wd168.ExamMngSys.repository.ExamAttemptRepository;
import com.wd168.ExamMngSys.repository.ExamRepository;
import com.wd168.ExamMngSys.repository.ModuleRepository;
import com.wd168.ExamMngSys.repository.SemesterRepository;
import com.wd168.ExamMngSys.repository.StudentModuleRepository;
import com.wd168.ExamMngSys.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final AcademicYearRepository academicYearRepository;
    private final SemesterRepository semesterRepository;
    private final ModuleRepository moduleRepository;
    private final StudentModuleRepository studentModuleRepository;
    private final ExamRepository examRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final UserRepository userRepository;

    public List<AcademicYear> getAllYears() {
        return academicYearRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<Semester> getSemestersByYear(Long yearId) {
        return semesterRepository.findByAcademicYearIdOrderByDisplayOrderAsc(yearId);
    }

    public List<Module> getModulesBySemester(Long semId) {
        return moduleRepository.findBySemesterId(semId);
    }

    public StudentModule enroll(Long studentId, Long moduleId, String enrollmentKey) {
        Module module = moduleRepository.findById(moduleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        if (!module.getEnrollmentKey().equals(enrollmentKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid enrollment key");
        }
        if (studentModuleRepository.existsByStudentIdAndModuleId(studentId, moduleId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already enrolled");
        }
        User student = userRepository.getReferenceById(studentId);
        StudentModule sm = new StudentModule();
        sm.setStudent(student);
        sm.setModule(module);
        return studentModuleRepository.save(sm);
    }

    public List<Module> getEnrolledModules(Long studentId) {
        return studentModuleRepository.findByStudentId(studentId).stream()
            .map(StudentModule::getModule)
            .collect(Collectors.toList());
    }

    public List<Exam> getExamsForModule(Long moduleId, Long studentId) {
        if (!studentModuleRepository.existsByStudentIdAndModuleId(studentId, moduleId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not enrolled in this module");
        }
        return examRepository.findByModuleId(moduleId);
    }

    public ExamAttempt accessExam(Long examId, Long studentId, String password) {
        Exam exam = examRepository.findById(examId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
        if (!exam.getAccessPassword().equals(password)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Incorrect exam password. Please try again.");
        }

        // Allow re-entry into an in-progress attempt
        var inProgress = examAttemptRepository
            .findByStudentIdAndExamIdAndStatus(studentId, examId, ExamAttempt.Status.IN_PROGRESS);
        if (inProgress.isPresent()) {
            return inProgress.get();
        }

        int maxAttempts = exam.getMaxAttempts() != null ? exam.getMaxAttempts() : 1;
        long used = examAttemptRepository.countByStudentIdAndExamId(studentId, examId);
        if (used >= maxAttempts) {
            String label = maxAttempts == 1 ? "attempt" : "attempts";
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You have used all " + maxAttempts + " allowed " + label + " for this exam.");
        }

        User student = userRepository.getReferenceById(studentId);
        ExamAttempt attempt = new ExamAttempt();
        attempt.setStudent(student);
        attempt.setExam(exam);
        attempt.setStartTime(LocalDateTime.now());
        attempt.setStatus(ExamAttempt.Status.IN_PROGRESS);
        attempt.setMaxScore(0);
        return examAttemptRepository.save(attempt);
    }

    public List<ExamAttempt> getReleasedResults(Long studentId) {
        return examAttemptRepository.findByStudentId(studentId).stream()
            .filter(a -> a.getExam().getResultsReleased())
            .collect(Collectors.toList());
    }
}
