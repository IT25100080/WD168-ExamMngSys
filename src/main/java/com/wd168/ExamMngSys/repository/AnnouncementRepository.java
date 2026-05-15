package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findAllByOrderByCreatedAtDesc();
    List<Announcement> findByModuleIsNullOrderByCreatedAtDesc();
    List<Announcement> findByPostedByIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT a FROM Announcement a WHERE a.module IS NULL OR a.module.id IN :moduleIds ORDER BY a.createdAt DESC")
    List<Announcement> findRelevantForStudent(@Param("moduleIds") List<Long> moduleIds);

    @Query("SELECT DISTINCT a FROM Announcement a JOIN a.module m JOIN m.lecturers l WHERE l.id = :lecturerId ORDER BY a.createdAt DESC")
    List<Announcement> findByModuleLecturerId(@Param("lecturerId") Long lecturerId);
}
