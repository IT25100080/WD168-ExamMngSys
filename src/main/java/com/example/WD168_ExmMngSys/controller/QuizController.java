package com.example.WD168_ExmMngSys.controller;

import com.wd168.ExamMngSys.dto.AnswerSubmitRequest;
import com.wd168.ExamMngSys.service.QuizService;
import com.wd168.ExamMngSys.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;
    private final UserService userService;

    @GetMapping("/{attemptId}/questions")
    public ResponseEntity<?> getQuestions(@PathVariable Long attemptId, Authentication auth) {
        return ResponseEntity.ok(quizService.getShuffledQuestions(attemptId, getStudentId(auth)));
    }

    @GetMapping("/{attemptId}/question/{questionId}")
    public ResponseEntity<?> getQuestion(@PathVariable Long attemptId,
                                          @PathVariable Long questionId,
                                          Authentication auth) {
        return ResponseEntity.ok(quizService.getQuestion(attemptId, questionId, getStudentId(auth)));
    }

    @PostMapping("/{attemptId}/answer")
    public ResponseEntity<?> saveAnswer(@PathVariable Long attemptId,
                                         @RequestBody AnswerSubmitRequest request,
                                         Authentication auth) {
        return ResponseEntity.ok(quizService.saveAnswer(
            attemptId, getStudentId(auth),
            request.getQuestionId(),
            request.getSelectedOptionIds(),
            request.getShortAnswerText()
        ));
    }

    @GetMapping("/{attemptId}/answers")
    public ResponseEntity<?> getSavedAnswers(@PathVariable Long attemptId, Authentication auth) {
        return ResponseEntity.ok(quizService.getSavedAnswers(attemptId, getStudentId(auth)));
    }

    @GetMapping("/{attemptId}/status")
    public ResponseEntity<?> getStatus(@PathVariable Long attemptId, Authentication auth) {
        return ResponseEntity.ok(quizService.getStatus(attemptId, getStudentId(auth)));
    }

    @PostMapping("/{attemptId}/submit")
    public ResponseEntity<?> submit(@PathVariable Long attemptId, Authentication auth) {
        return ResponseEntity.ok(quizService.submitExam(attemptId, getStudentId(auth)));
    }

    private Long getStudentId(Authentication auth) {
        return userService.findByUsername(auth.getName()).getId();
    }
}
