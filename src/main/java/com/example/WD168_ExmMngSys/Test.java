package com.example.WD168_ExmMngSys;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Test {

    @GetMapping("/hello")
    public String sayHello() {
        return "Hello from Exam Management System!";
    }

    @GetMapping("/")
    public String home() {
        return "Welcome to Exam Management System!";
    }

    @GetMapping("/status")
    public String status() {
        return "Application is running on port 8080!";
    }
}