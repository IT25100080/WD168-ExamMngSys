package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

/** Repository for announcement data access. */
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    /** Returns all announcements sorted by newest first. */
    List<Announcement> findAllByOrderByCreatedAtDesc();

    /** Returns only global announcements (not tied to any module), newest first. */
    List<Announcement> findByModuleIsNullOrderByCreatedAtDesc();

    /** Returns all announcements posted by a specific user, newest first. */
    List<Announcement> findByPostedByIdOrderByCreatedAtDesc(Long userId);

    /** Returns global announcements plus those belonging to the given modules, newest first. */
    @Query("SELECT a FROM Announcement a WHERE a.module IS NULL OR a.module.id IN :moduleIds ORDER BY a.createdAt DESC")
    List<Announcement> findRelevantForStudent(@Param("moduleIds") List<Long> moduleIds);

    /** Returns all announcements posted within any module taught by the given lecturer, newest first. */
    @Query("SELECT DISTINCT a FROM Announcement a JOIN a.module m JOIN m.lecturers l WHERE l.id = :lecturerId ORDER BY a.createdAt DESC")
    List<Announcement> findByModuleLecturerId(@Param("lecturerId") Long lecturerId);
}