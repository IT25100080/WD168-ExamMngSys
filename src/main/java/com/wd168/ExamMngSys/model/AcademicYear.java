package com.wd168.ExamMngSys.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "academic_years")
@Data
public class AcademicYear {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String name;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}
