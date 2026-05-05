package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.AnswerOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface AnswerOptionRepository extends JpaRepository<AnswerOption, Long> {
    List<AnswerOption> findByQuestionId(Long questionId);

    @Transactional
    void deleteByQuestionId(Long questionId);
}
