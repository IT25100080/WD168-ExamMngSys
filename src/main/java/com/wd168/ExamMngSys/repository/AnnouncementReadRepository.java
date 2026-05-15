package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.AnnouncementRead;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnnouncementReadRepository extends JpaRepository<AnnouncementRead, Long> {
    List<AnnouncementRead> findByUserId(Long userId);
    boolean existsByAnnouncementIdAndUserId(Long announcementId, Long userId);
    void deleteByAnnouncementId(Long announcementId);
}
