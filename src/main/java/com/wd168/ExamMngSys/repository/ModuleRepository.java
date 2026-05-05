package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.Module;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModuleRepository extends JpaRepository<Module, Long> {
    List<Module> findBySemesterId(Long semesterId);
    List<Module> findByLecturersId(Long lecturerId);
    boolean existsByModuleCode(String moduleCode);
}
