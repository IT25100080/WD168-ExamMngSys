package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.Exam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByModuleId(Long moduleId);
    List<Exam> findByModuleLecturersId(Long lecturerId);
}
