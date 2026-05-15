package com.wd168.ExamMngSys.service;

import com.wd168.ExamMngSys.model.AnswerOption;
import com.wd168.ExamMngSys.model.Concern;
import com.wd168.ExamMngSys.model.Exam;
import com.wd168.ExamMngSys.model.ExamAttempt;
import com.wd168.ExamMngSys.model.Module;
import com.wd168.ExamMngSys.model.Question;
import com.wd168.ExamMngSys.model.StudentAnswer;
import com.wd168.ExamMngSys.repository.AnswerOptionRepository;
import com.wd168.ExamMngSys.repository.ConcernRepository;
import com.wd168.ExamMngSys.repository.ExamAttemptRepository;
import com.wd168.ExamMngSys.repository.ExamRepository;
import com.wd168.ExamMngSys.repository.ModuleRepository;
import com.wd168.ExamMngSys.repository.QuestionRepository;
import com.wd168.ExamMngSys.repository.StudentAnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LecturerService {

    private final ModuleRepository moduleRepository;
    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final ConcernRepository concernRepository;

    public List<Module> getAssignedModules(Long lecturerId) {
        return moduleRepository.findByLecturersId(lecturerId);
    }

    public List<Exam> getExamsForLecturer(Long lecturerId) {
        return examRepository.findByModuleLecturersId(lecturerId);
    }

    public Exam createExam(Long moduleId, Long lecturerId, String title, String description,
                            int durationMinutes, String accessPassword,
                            LocalDateTime startTime, LocalDateTime endTime, Exam.Status status,
                            int maxAttempts) {
        Module module = moduleRepository.findById(moduleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        if (module.getLecturers().stream().noneMatch(l -> l.getId().equals(lecturerId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your module");
        }
        Exam exam = new Exam();
        exam.setModule(module);
        exam.setTitle(title);
        exam.setDescription(description);
        exam.setDurationMinutes(durationMinutes);
        exam.setAccessPassword(accessPassword);
        exam.setStartTime(startTime);
        exam.setEndTime(endTime);
        exam.setStatus(status != null ? status : Exam.Status.DRAFT);
        exam.setMaxAttempts(maxAttempts < 1 ? 1 : maxAttempts);
        return examRepository.save(exam);
    }

    public Exam updateExam(Long examId, Long lecturerId, String title, String description,
                            int durationMinutes, String accessPassword,
                            LocalDateTime startTime, LocalDateTime endTime, Exam.Status status,
                            int maxAttempts) {
        Exam exam = getExamForLecturer(examId, lecturerId);
        exam.setTitle(title);
        exam.setDescription(description);
        exam.setDurationMinutes(durationMinutes);
        exam.setAccessPassword(accessPassword);
        exam.setStartTime(startTime);
        exam.setEndTime(endTime);
        exam.setStatus(status);
        exam.setMaxAttempts(maxAttempts < 1 ? 1 : maxAttempts);
        return examRepository.save(exam);
    }

    public void deleteExam(Long examId, Long lecturerId) {
        Exam exam = getExamForLecturer(examId, lecturerId);
        examRepository.delete(exam);
    }

    public List<Question> getQuestions(Long examId, Long lecturerId) {
        getExamForLecturer(examId, lecturerId);
        return questionRepository.findByExamIdOrderByDisplayOrderAsc(examId);
    }

    @Transactional
    public Question addQuestion(Long examId, Long lecturerId, String questionText,
                                 Question.QuestionType questionType, int marks,
                                 List<Map<String, Object>> options, String imageUrl) {
        Exam exam = getExamForLecturer(examId, lecturerId);
        int order = questionRepository.countByExamId(examId) + 1;

        Question question = new Question();
        question.setExam(exam);
        question.setQuestionText(questionText);
        question.setQuestionType(questionType);
        question.setMarks(marks);
        question.setDisplayOrder(order);
        question.setImageUrl(imageUrl != null && !imageUrl.isBlank() ? imageUrl : null);
        question = questionRepository.save(question);

        if (options != null) {
            for (Map<String, Object> opt : options) {
                AnswerOption ao = new AnswerOption();
                ao.setQuestion(question);
                ao.setOptionText((String) opt.get("optionText"));
                ao.setIsCorrect(Boolean.TRUE.equals(opt.get("isCorrect")));
                answerOptionRepository.save(ao);
            }
        }
        return question;
    }

    @Transactional
    public Question updateQuestion(Long questionId, Long lecturerId, String questionText,
                                    Question.QuestionType questionType, int marks,
                                    List<Map<String, Object>> options, String imageUrl) {
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        getExamForLecturer(question.getExam().getId(), lecturerId);

        question.setQuestionText(questionText);
        question.setQuestionType(questionType);
        question.setMarks(marks);
        question.setImageUrl(imageUrl != null && !imageUrl.isBlank() ? imageUrl : null);
        question = questionRepository.save(question);

        answerOptionRepository.deleteByQuestionId(questionId);
        if (options != null) {
            for (Map<String, Object> opt : options) {
                AnswerOption ao = new AnswerOption();
                ao.setQuestion(question);
                ao.setOptionText((String) opt.get("optionText"));
                ao.setIsCorrect(Boolean.TRUE.equals(opt.get("isCorrect")));
                answerOptionRepository.save(ao);
            }
        }
        return question;
    }

    public void deleteQuestion(Long questionId, Long lecturerId) {
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        getExamForLecturer(question.getExam().getId(), lecturerId);
        questionRepository.delete(question);
    }

    public List<ExamAttempt> getAttempts(Long examId, Long lecturerId) {
        getExamForLecturer(examId, lecturerId);
        return examAttemptRepository.findByExamId(examId);
    }

    public List<Map<String, Object>> getAttemptAnswers(Long attemptId, Long lecturerId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attempt not found"));
        getExamForLecturer(attempt.getExam().getId(), lecturerId);

        return studentAnswerRepository.findByAttemptId(attemptId).stream()
            .map(a -> {
                java.util.HashMap<String, Object> map = new java.util.HashMap<>();
                map.put("id", a.getId());
                map.put("questionId", a.getQuestion().getId());
                map.put("questionText", a.getQuestion().getQuestionText());
                map.put("questionType", a.getQuestion().getQuestionType().name());
                map.put("marks", a.getQuestion().getMarks());
                map.put("shortAnswerText", a.getShortAnswerText() != null ? a.getShortAnswerText() : "");
                map.put("awardedMarks", a.getAwardedMarks() != null ? a.getAwardedMarks() : 0);

                // Parse which option IDs the student selected
                java.util.Set<Long> selectedIds = new java.util.HashSet<>();
                if (a.getSelectedOptionIds() != null && !a.getSelectedOptionIds().isBlank()) {
                    for (String part : a.getSelectedOptionIds().split(",")) {
                        try { selectedIds.add(Long.parseLong(part.trim())); }
                        catch (NumberFormatException ignored) {}
                    }
                }

                // For choice-based questions, resolve all options with selected + correct flags
                if (a.getQuestion().getQuestionType() != Question.QuestionType.SHORT_ANSWER) {
                    List<Map<String, Object>> opts = answerOptionRepository
                        .findByQuestionId(a.getQuestion().getId())
                        .stream().map(opt -> {
                            java.util.HashMap<String, Object> o = new java.util.HashMap<>();
                            o.put("optionText", opt.getOptionText());
                            o.put("isCorrect", opt.getIsCorrect());
                            o.put("selected", selectedIds.contains(opt.getId()));
                            return (Map<String, Object>) o;
                        }).collect(java.util.stream.Collectors.toList());
                    map.put("options", opts);
                } else {
                    map.put("options", java.util.Collections.emptyList());
                }
                return map;
            })
            .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void deleteAttempt(Long attemptId, Long lecturerId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attempt not found"));
        getExamForLecturer(attempt.getExam().getId(), lecturerId);
        studentAnswerRepository.deleteByAttemptId(attemptId);
        examAttemptRepository.delete(attempt);
    }

    @Transactional
    public void gradeShortAnswer(Long attemptId, Long questionId, int marks, Long lecturerId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attempt not found"));
        getExamForLecturer(attempt.getExam().getId(), lecturerId);

        StudentAnswer answer = studentAnswerRepository.findByAttemptIdAndQuestionId(attemptId, questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Answer not found"));
        answer.setAwardedMarks(marks);
        studentAnswerRepository.save(answer);

        int manualScore = studentAnswerRepository.findByAttemptId(attemptId).stream()
            .filter(a -> a.getQuestion().getQuestionType() == Question.QuestionType.SHORT_ANSWER)
            .mapToInt(a -> a.getAwardedMarks() != null ? a.getAwardedMarks() : 0)
            .sum();
        attempt.setManualScore(manualScore);
        examAttemptRepository.save(attempt);
    }

    public Exam releaseResults(Long examId, Long lecturerId) {
        Exam exam = getExamForLecturer(examId, lecturerId);
        exam.setResultsReleased(true);
        return examRepository.save(exam);
    }

    public Exam reviseResults(Long examId, Long lecturerId) {
        Exam exam = getExamForLecturer(examId, lecturerId);
        exam.setResultsReleased(false);
        return examRepository.save(exam);
    }

    public List<Map<String, Object>> getMarksheet(Long examId, Long lecturerId) {
        getExamForLecturer(examId, lecturerId);
        return examAttemptRepository.findByExamId(examId).stream()
            .filter(a -> a.getStatus() != ExamAttempt.Status.IN_PROGRESS)
            .map(a -> {
                int scored = (a.getAutoScore() != null ? a.getAutoScore() : 0)
                           + (a.getManualScore() != null ? a.getManualScore() : 0);
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("username", a.getStudent().getUsername());
                row.put("fullName", a.getStudent().getFullName() != null ? a.getStudent().getFullName() : "");
                row.put("mark", scored);
                row.put("maxScore", a.getMaxScore() != null ? a.getMaxScore() : 0);
                return row;
            })
            .collect(Collectors.toList());
    }

    public List<Concern> getLecturerConcerns(Long lecturerId) {
        return concernRepository.findByExamModuleLecturersIdOrderByCreatedAtDesc(lecturerId);
    }

    @Transactional
    public Concern replyConcern(Long concernId, Long lecturerId, String reply, boolean resolved) {
        Concern concern = concernRepository.findById(concernId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Concern not found"));
        getExamForLecturer(concern.getExam().getId(), lecturerId);
        concern.setLecturerReply(reply);
        concern.setStatus(resolved ? Concern.Status.RESOLVED : Concern.Status.OPEN);
        concern.setRepliedAt(java.time.LocalDateTime.now());
        return concernRepository.save(concern);
    }

    private Exam getExamForLecturer(Long examId, Long lecturerId) {
        Exam exam = examRepository.findById(examId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));
        if (exam.getModule().getLecturers().stream().noneMatch(l -> l.getId().equals(lecturerId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your exam");
        }
        return exam;
    }
}
