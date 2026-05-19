package com.wd168.ExamMngSys.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

/**
 * Represents an announcement posted by an admin or lecturer.
 * Can be global (module = null) or scoped to a specific module.
 */
@Entity
@Table(name = "announcements")
@Getter @Setter @NoArgsConstructor
public class Announcement {

    /** Auto-generated primary key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user who posted this announcement. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User postedBy;

    /** The module this announcement belongs to. Null if it's a global announcement. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Module module;

    /** Short title of the announcement (max 200 characters). */
    @Column(nullable = false, length = 200)
    private String title;

    /** Full body/content of the announcement. */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    /** Timestamp of when the announcement was created. Defaults to now. */
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}