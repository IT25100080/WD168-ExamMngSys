package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.AcademicYear;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AcademicYearRepository extends JpaRepository<AcademicYear, Long> {
    List<AcademicYear> findAllByOrderByDisplayOrderAsc();
    boolean existsByName(String name);
}
