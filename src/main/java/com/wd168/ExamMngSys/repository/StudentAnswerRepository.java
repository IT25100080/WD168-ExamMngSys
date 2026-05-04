package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, Long> {
    List<StudentAnswer> findByAttemptId(Long attemptId);
    Optional<StudentAnswer> findByAttemptIdAndQuestionId(Long attemptId, Long questionId);

    @Transactional
    void deleteByAttemptId(Long attemptId);
}
