package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.Concern;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConcernRepository extends JpaRepository<Concern, Long> {
    List<Concern> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<Concern> findByExamModuleLecturersIdOrderByCreatedAtDesc(Long lecturerId);
}
