package com.college.railway.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping("/api/healthz")
    public Map<String, String> healthCheck() {
        return Map.of("status", "ok");
    }
}
