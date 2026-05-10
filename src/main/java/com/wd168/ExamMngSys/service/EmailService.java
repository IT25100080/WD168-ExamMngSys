package com.wd168.ExamMngSys.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@examportal.com}")
    private String from;

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

    public void sendResetRequestConfirmation(String toEmail, String username) {
        if (mailSender == null || toEmail == null || toEmail.isBlank()) return;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(toEmail);
            msg.setSubject("ExamPortal – Password Reset Request Received");
            msg.setText(
                "Hello " + username + ",\n\n" +
                "We received a password reset request for your ExamPortal account.\n\n" +
                "An administrator will reset your password shortly. " +
                "You will receive another email with your new password once it is done.\n\n" +
                "If you did not request this, please ignore this email.\n\n" +
                "– ExamPortal"
            );
            mailSender.send(msg);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send confirmation email to " + toEmail + ": " + e.getMessage());
        }
    }
}
