package com.example.WD168_ExmMngSys.repository;

import com.wd168.ExamMngSys.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByExamIdOrderByDisplayOrderAsc(Long examId);
    int countByExamId(Long examId);
}
