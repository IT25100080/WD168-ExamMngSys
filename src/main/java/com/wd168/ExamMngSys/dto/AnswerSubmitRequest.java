package com.wd168.ExamMngSys.dto;

import lombok.Data;

import java.util.List;

@Data
public class AnswerSubmitRequest {
    private Long questionId;
    private List<Long> selectedOptionIds;
    private String shortAnswerText;
}
