package com.wd168.ExamMngSys.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

/**
 * Tracks which users have read which announcements.
 * Each user can only have one read record per announcement.
 */
@Entity
@Table(name = "announcement_reads",
        uniqueConstraints = @UniqueConstraint(columnNames = {"announcement_id", "user_id"}))
@Getter @Setter @NoArgsConstructor
public class AnnouncementRead {

    /** Auto-generated primary key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The announcement that was read. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "announcement_id", nullable = false)
    private Announcement announcement;

    /** The user who read the announcement. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Timestamp of when the user read the announcement. Defaults to now. */
    @Column(name = "read_at")
    private LocalDateTime readAt = LocalDateTime.now();
}