package com.example.WD168_ExmMngSys.dto;

import lombok.Data;

import java.util.List;

@Data
public class AnswerSubmitRequest {
    private Long questionId;
    private List<Long> selectedOptionIds;
    private String shortAnswerText;
}
