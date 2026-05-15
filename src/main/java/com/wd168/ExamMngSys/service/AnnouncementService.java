package com.wd168.ExamMngSys.service;

import com.wd168.ExamMngSys.model.Announcement;
import com.wd168.ExamMngSys.model.AnnouncementRead;
import com.wd168.ExamMngSys.model.Module;
import com.wd168.ExamMngSys.repository.AnnouncementReadRepository;
import com.wd168.ExamMngSys.repository.AnnouncementRepository;
import com.wd168.ExamMngSys.repository.ModuleRepository;
import com.wd168.ExamMngSys.repository.StudentModuleRepository;
import com.wd168.ExamMngSys.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementReadRepository announcementReadRepository;
    private final StudentModuleRepository studentModuleRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;

    public Announcement postAdminAnnouncement(Long adminId, Long moduleId, String title, String message) {
        Announcement a = new Announcement();
        a.setPostedBy(userRepository.getReferenceById(adminId));
        if (moduleId != null) {
            a.setModule(moduleRepository.findById(moduleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found")));
        }
        a.setTitle(title);
        a.setMessage(message);
        return announcementRepository.save(a);
    }

    public Announcement postLecturerAnnouncement(Long lecturerId, Long moduleId, String title, String message) {
        Module module = moduleRepository.findById(moduleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        if (module.getLecturers().stream().noneMatch(l -> l.getId().equals(lecturerId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your module");
        }
        Announcement a = new Announcement();
        a.setPostedBy(userRepository.getReferenceById(lecturerId));
        a.setModule(module);
        a.setTitle(title);
        a.setMessage(message);
        return announcementRepository.save(a);
    }

    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Announcement> getLecturerAnnouncements(Long lecturerId) {
        return announcementRepository.findByModuleLecturerId(lecturerId);
    }

    @Transactional
    public void deleteAnnouncement(Long id, Long userId) {
        Announcement a = announcementRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));
        if (!a.getPostedBy().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your announcement");
        }
        announcementReadRepository.deleteByAnnouncementId(id);
        announcementRepository.delete(a);
    }

    @Transactional
    public void deleteAnnouncementAsAdmin(Long id) {
        if (!announcementRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found");
        }
        announcementReadRepository.deleteByAnnouncementId(id);
        announcementRepository.deleteById(id);
    }

    public List<Map<String, Object>> getStudentAnnouncements(Long studentId) {
        List<Long> moduleIds = studentModuleRepository.findByStudentId(studentId)
            .stream().map(sm -> sm.getModule().getId()).collect(Collectors.toList());
        Set<Long> readIds = announcementReadRepository.findByUserId(studentId)
            .stream().map(r -> r.getAnnouncement().getId()).collect(Collectors.toSet());
        List<Announcement> list = moduleIds.isEmpty()
            ? announcementRepository.findByModuleIsNullOrderByCreatedAtDesc()
            : announcementRepository.findRelevantForStudent(moduleIds);
        return list.stream().map(a -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", a.getId());
            map.put("title", a.getTitle());
            map.put("message", a.getMessage());
            map.put("createdAt", a.getCreatedAt());
            map.put("postedBy", a.getPostedBy());
            map.put("module", a.getModule());
            map.put("read", readIds.contains(a.getId()));
            return map;
        }).collect(Collectors.toList());
    }

    public long getUnreadCount(Long studentId) {
        List<Long> moduleIds = studentModuleRepository.findByStudentId(studentId)
            .stream().map(sm -> sm.getModule().getId()).collect(Collectors.toList());
        List<Announcement> all = moduleIds.isEmpty()
            ? announcementRepository.findByModuleIsNullOrderByCreatedAtDesc()
            : announcementRepository.findRelevantForStudent(moduleIds);
        Set<Long> readIds = announcementReadRepository.findByUserId(studentId)
            .stream().map(r -> r.getAnnouncement().getId()).collect(Collectors.toSet());
        return all.stream().filter(a -> !readIds.contains(a.getId())).count();
    }

    @Transactional
    public void markRead(Long studentId, List<Long> announcementIds) {
        for (Long id : announcementIds) {
            if (!announcementReadRepository.existsByAnnouncementIdAndUserId(id, studentId)) {
                AnnouncementRead r = new AnnouncementRead();
                r.setAnnouncement(announcementRepository.getReferenceById(id));
                r.setUser(userRepository.getReferenceById(studentId));
                announcementReadRepository.save(r);
            }
        }
    }
}
