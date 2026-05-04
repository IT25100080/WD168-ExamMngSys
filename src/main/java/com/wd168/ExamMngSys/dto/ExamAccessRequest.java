package com.wd168.ExamMngSys.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ExamAccessRequest {
    @NotBlank
    private String password;
}
