package com.example.WD168_ExmMngSys.service;

import com.wd168.ExamMngSys.model.AnswerOption;
import com.wd168.ExamMngSys.model.ExamAttempt;
import com.wd168.ExamMngSys.model.Question;
import com.wd168.ExamMngSys.model.StudentAnswer;
import com.wd168.ExamMngSys.repository.AnswerOptionRepository;
import com.wd168.ExamMngSys.repository.ExamAttemptRepository;
import com.wd168.ExamMngSys.repository.QuestionRepository;
import com.wd168.ExamMngSys.repository.StudentAnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final ExamAttemptRepository examAttemptRepository;
    private final QuestionRepository questionRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final StudentAnswerRepository studentAnswerRepository;

    public List<Question> getShuffledQuestions(Long attemptId, Long studentId) {
        ExamAttempt attempt = getAttemptForStudent(attemptId, studentId);
        checkTimeout(attempt);
        List<Question> questions = new ArrayList<>(
            questionRepository.findByExamIdOrderByDisplayOrderAsc(attempt.getExam().getId())
        );
        Collections.shuffle(questions, new Random(attemptId));
        return questions;
    }

    public Question getQuestion(Long attemptId, Long questionId, Long studentId) {
        getAttemptForStudent(attemptId, studentId);
        return questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
    }

    @Transactional
    public StudentAnswer saveAnswer(Long attemptId, Long studentId, Long questionId,
                                     List<Long> selectedOptionIds, String shortAnswerText) {
        ExamAttempt attempt = getAttemptForStudent(attemptId, studentId);
        if (attempt.getStatus() != ExamAttempt.Status.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exam already submitted");
        }
        checkTimeout(attempt);

        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        StudentAnswer answer = studentAnswerRepository
            .findByAttemptIdAndQuestionId(attemptId, questionId)
            .orElse(new StudentAnswer());
        answer.setAttempt(attempt);
        answer.setQuestion(question);

        if (question.getQuestionType() == Question.QuestionType.SHORT_ANSWER) {
            answer.setShortAnswerText(shortAnswerText);
        } else {
            String ids = selectedOptionIds == null ? "" :
                selectedOptionIds.stream().map(String::valueOf).collect(Collectors.joining(","));
            answer.setSelectedOptionIds(ids);
        }
        return studentAnswerRepository.save(answer);
    }

    public List<Map<String, Object>> getSavedAnswers(Long attemptId, Long studentId) {
        getAttemptForStudent(attemptId, studentId);
        return studentAnswerRepository.findByAttemptId(attemptId).stream()
            .map(a -> {
                Map<String, Object> map = new HashMap<>();
                map.put("questionId", a.getQuestion().getId());
                map.put("selectedOptionIds", a.getSelectedOptionIds() != null ? a.getSelectedOptionIds() : "");
                map.put("shortAnswerText", a.getShortAnswerText() != null ? a.getShortAnswerText() : "");
                return map;
            })
            .collect(Collectors.toList());
    }

    public Map<String, Object> getStatus(Long attemptId, Long studentId) {
        ExamAttempt attempt = getAttemptForStudent(attemptId, studentId);
        checkTimeout(attempt);

        long secondsRemaining = 0;
        if (attempt.getStatus() == ExamAttempt.Status.IN_PROGRESS) {
            long elapsed = ChronoUnit.SECONDS.between(attempt.getStartTime(), LocalDateTime.now());
            long total = attempt.getExam().getDurationMinutes() * 60L;
            secondsRemaining = Math.max(0, total - elapsed);
        }

        long answered = studentAnswerRepository.findByAttemptId(attemptId).size();
        int total = questionRepository.countByExamId(attempt.getExam().getId());

        Map<String, Object> status = new HashMap<>();
        status.put("secondsRemaining", secondsRemaining);
        status.put("answeredCount", answered);
        status.put("totalQuestions", total);
        status.put("attemptStatus", attempt.getStatus().name());
        return status;
    }

    @Transactional
    public ExamAttempt submitExam(Long attemptId, Long studentId) {
        ExamAttempt attempt = getAttemptForStudent(attemptId, studentId);
        if (attempt.getStatus() == ExamAttempt.Status.SUBMITTED) {
            return attempt;
        }
        if (attempt.getStatus() != ExamAttempt.Status.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exam already submitted");
        }
        return finalizeAttempt(attempt, ExamAttempt.Status.SUBMITTED);
    }

    private void checkTimeout(ExamAttempt attempt) {
        if (attempt.getStatus() != ExamAttempt.Status.IN_PROGRESS) return;
        long elapsed = ChronoUnit.SECONDS.between(attempt.getStartTime(), LocalDateTime.now());
        long total = attempt.getExam().getDurationMinutes() * 60L;
        if (elapsed >= total) {
            finalizeAttempt(attempt, ExamAttempt.Status.SUBMITTED);
        }
    }

    private ExamAttempt finalizeAttempt(ExamAttempt attempt, ExamAttempt.Status status) {
        attempt.setStatus(status);
        attempt.setEndTime(LocalDateTime.now());

        List<StudentAnswer> answers = studentAnswerRepository.findByAttemptId(attempt.getId());
        List<Question> questions = questionRepository.findByExamIdOrderByDisplayOrderAsc(attempt.getExam().getId());

        int autoScore = 0;
        int maxScore = 0;

        for (Question q : questions) {
            maxScore += q.getMarks();
            if (q.getQuestionType() == Question.QuestionType.SHORT_ANSWER) continue;

            Optional<StudentAnswer> sa = answers.stream()
                .filter(a -> a.getQuestion().getId().equals(q.getId()))
                .findFirst();
            if (sa.isEmpty()) continue;

            List<Long> correctIds = answerOptionRepository.findByQuestionId(q.getId()).stream()
                .filter(AnswerOption::getIsCorrect)
                .map(AnswerOption::getId)
                .collect(Collectors.toList());

            List<Long> selectedIds = parseIds(sa.get().getSelectedOptionIds());

            if (q.getQuestionType() == Question.QuestionType.MULTI_SELECT) {
                if (new HashSet<>(correctIds).equals(new HashSet<>(selectedIds))) {
                    autoScore += q.getMarks();
                }
            } else {
                if (correctIds.size() == 1 && selectedIds.size() == 1
                        && correctIds.get(0).equals(selectedIds.get(0))) {
                    autoScore += q.getMarks();
                }
            }
        }

        attempt.setAutoScore(autoScore);
        attempt.setMaxScore(maxScore);
        return examAttemptRepository.save(attempt);
    }

    private List<Long> parseIds(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(Long::parseLong)
            .collect(Collectors.toList());
    }

    private ExamAttempt getAttemptForStudent(Long attemptId, Long studentId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attempt not found"));
        if (!attempt.getStudent().getId().equals(studentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your attempt");
        }
        return attempt;
    }
}
