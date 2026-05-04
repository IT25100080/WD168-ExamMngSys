package com.example.WD168_ExmMngSys.repository;

import com.wd168.ExamMngSys.model.StudentModule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudentModuleRepository extends JpaRepository<StudentModule, Long> {
    List<StudentModule> findByStudentId(Long studentId);
    Optional<StudentModule> findByStudentIdAndModuleId(Long studentId, Long moduleId);
    boolean existsByStudentIdAndModuleId(Long studentId, Long moduleId);
}
