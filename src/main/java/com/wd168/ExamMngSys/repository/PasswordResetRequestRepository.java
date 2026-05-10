package com.wd168.ExamMngSys.repository;

import com.wd168.ExamMngSys.model.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    List<PasswordResetRequest> findByStatusOrderByRequestedAtDesc(PasswordResetRequest.Status status);
    Optional<PasswordResetRequest> findByUserIdAndStatus(Long userId, PasswordResetRequest.Status status);
}
