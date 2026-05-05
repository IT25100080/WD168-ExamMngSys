package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.Semester;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SemesterRepository extends JpaRepository<Semester, Long> {
    List<Semester> findByAcademicYearIdOrderByDisplayOrderAsc(Long academicYearId);
}
