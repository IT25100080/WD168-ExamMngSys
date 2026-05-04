package com.example.WD168_ExmMngSys.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "student_answers")
@Getter
@Setter
@NoArgsConstructor
public class StudentAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ExamAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "options"})
    private Question question;

    @Column(name = "selected_option_ids", length = 255)
    private String selectedOptionIds;

    @Column(name = "short_answer_text", columnDefinition = "TEXT")
    private String shortAnswerText;

    @Column(name = "awarded_marks")
    private Integer awardedMarks = 0;
}
