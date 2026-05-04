package com.example.WD168_ExmMngSys.repository;

import com.wd168.ExamMngSys.model.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {
    Optional<ExamAttempt> findByStudentIdAndExamId(Long studentId, Long examId);
    Optional<ExamAttempt> findByStudentIdAndExamIdAndStatus(Long studentId, Long examId, ExamAttempt.Status status);
    long countByStudentIdAndExamId(Long studentId, Long examId);
    boolean existsByStudentIdAndExamId(Long studentId, Long examId);
    List<ExamAttempt> findByExamId(Long examId);
    List<ExamAttempt> findByStudentId(Long studentId);
}
