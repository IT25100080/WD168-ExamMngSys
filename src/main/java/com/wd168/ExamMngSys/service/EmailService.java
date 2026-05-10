package com.wd168.ExamMngSys.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@examportal.com}")
    private String from;

    @Async
    public void sendPasswordResetNotification(String toEmail, String username, String newPassword) {
        if (mailSender == null || toEmail == null || toEmail.isBlank()) return;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(toEmail);
            msg.setSubject("ExamPortal – Your Password Has Been Reset");
            msg.setText(
                "Hello " + username + ",\n\n" +
                "An administrator has reset your ExamPortal password.\n\n" +
                "Your new password is: " + newPassword + "\n\n" +
                "Please log in and change your password as soon as possible.\n\n" +
                "– ExamPortal"
            );
            mailSender.send(msg);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send password reset email to " + toEmail + ": " + e.getMessage());
        }
    }

    public boolean isEmailConfigured() {
        return mailSender != null;
    }

    @Async
    public void sendTemporaryPassword(String toEmail, String username, String tempPassword) {
        if (mailSender == null || toEmail == null || toEmail.isBlank()) return;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(toEmail);
            msg.setSubject("ExamPortal – Your Temporary Password");
            msg.setText(
                "Hello " + username + ",\n\n" +
                "A temporary password has been generated for your ExamPortal account.\n\n" +
                "Your temporary password is: " + tempPassword + "\n\n" +
                "Please log in using this password and change it immediately.\n\n" +
                "– ExamPortal"
            );
            mailSender.send(msg);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send temporary password email to " + toEmail + ": " + e.getMessage());
        }
    }
}
