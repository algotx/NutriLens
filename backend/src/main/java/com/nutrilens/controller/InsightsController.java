package com.nutrilens.controller;

import com.nutrilens.repository.MealLogRepository;
import com.nutrilens.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final MealLogRepository mealRepo;
    private final UserRepository userRepo;

    @Value("${app.gemini.api-key}")
    private String geminiKey;

    public InsightsController(MealLogRepository mealRepo, UserRepository userRepo) {
        this.mealRepo = mealRepo;
        this.userRepo = userRepo;
    }

    // ── Weekly calories (last 7 days) ─────────────────────────────────────────
    @GetMapping("/weekly")
    public ResponseEntity<?> weekly(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        List<Map<String, Object>> days = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            List<Object[]> rows = mealRepo.getDailySummary(userId, date);
            Object[] row = (rows != null && !rows.isEmpty()) ? rows.get(0) : new Object[]{0.0,0.0,0.0,0.0,0.0,0L};
            Map<String, Object> day = new LinkedHashMap<>();
            day.put("date", date.toString());
            day.put("day", date.getDayOfWeek().toString().substring(0, 3));
            day.put("calories", row[0] != null ? ((Number) row[0]).doubleValue() : 0.0);
            day.put("protein",  row[1] != null ? ((Number) row[1]).doubleValue() : 0.0);
            day.put("carbs",    row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);
            day.put("fat",      row[3] != null ? ((Number) row[3]).doubleValue() : 0.0);
            day.put("logged",   row[5] != null && ((Number) row[5]).longValue() > 0);
            days.add(day);
        }
        return ResponseEntity.ok(days);
    }

    // ── Streak ────────────────────────────────────────────────────────────────
    @GetMapping("/streak")
    public ResponseEntity<?> streak(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        int streak = 0;
        LocalDate date = LocalDate.now();
        // Check today first — if nothing logged today, start from yesterday
        List<Object[]> todayRows = mealRepo.getDailySummary(userId, date);
        boolean loggedToday = todayRows != null && !todayRows.isEmpty()
            && todayRows.get(0)[5] != null && ((Number) todayRows.get(0)[5]).longValue() > 0;
        if (!loggedToday) date = date.minusDays(1);

        for (int i = 0; i < 365; i++) {
            List<Object[]> rows = mealRepo.getDailySummary(userId, date);
            boolean logged = rows != null && !rows.isEmpty()
                && rows.get(0)[5] != null && ((Number) rows.get(0)[5]).longValue() > 0;
            if (!logged) break;
            streak++;
            date = date.minusDays(1);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("streak", streak);
        result.put("logged_today", loggedToday);
        return ResponseEntity.ok(result);
    }

    // ── AI Coach chat ─────────────────────────────────────────────────────────
    @PostMapping("/coach")
    public ResponseEntity<?> coach(@RequestBody Map<String, Object> body, Authentication auth) throws Exception {
        Long userId = (Long) auth.getPrincipal();
        String question = (String) body.getOrDefault("question", "");
        if (question.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Question is required"));

        // Build context from last 7 days
        StringBuilder ctx = new StringBuilder();
        ctx.append("User's nutrition data (last 7 days):\n");
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            List<Object[]> rows = mealRepo.getDailySummary(userId, date);
            if (rows != null && !rows.isEmpty() && rows.get(0)[5] != null
                    && ((Number) rows.get(0)[5]).longValue() > 0) {
                Object[] r = rows.get(0);
                ctx.append(String.format("%s: %.0f kcal, P:%.0fg, C:%.0fg, F:%.0fg\n",
                    date, toD(r[0]), toD(r[1]), toD(r[2]), toD(r[3])));
            }
        }

        String prompt = "You are a friendly, expert nutrition coach. Answer concisely in 2-4 sentences. "
            + "Be specific and actionable. Do not use markdown.\n\n"
            + ctx + "\nUser question: " + question;

        String bodyJson = "{\"contents\":[{\"parts\":[{\"text\":" + toJsonString(prompt) + "}]}],"
            + "\"generationConfig\":{\"temperature\":0.7,\"maxOutputTokens\":300,"
            + "\"thinkingConfig\":{\"thinkingBudget\":0}}}";

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey;
        HttpRequest req = HttpRequest.newBuilder().uri(URI.create(url))
            .header("Content-Type", "application/json")
            .timeout(java.time.Duration.ofSeconds(30))
            .POST(HttpRequest.BodyPublishers.ofString(bodyJson)).build();
        HttpResponse<String> resp = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(10)).build()
            .send(req, HttpResponse.BodyHandlers.ofString());

        String answer = extractText(resp.body());
        if (answer == null || answer.isBlank())
            return ResponseEntity.status(500).body(Map.of("error", "Could not get a response"));
        return ResponseEntity.ok(Map.of("answer", answer));
    }

    private double toD(Object v) {
        if (v == null) return 0;
        return ((Number) v).doubleValue();
    }

    private String extractText(String body) {
        int idx = -1, from = 0;
        while (true) {
            int f = body.indexOf("\"text\":", from);
            if (f < 0) break;
            idx = f; from = f + 7;
        }
        if (idx < 0) return null;
        int qs = body.indexOf("\"", idx + 7);
        if (qs < 0) return null;
        StringBuilder sb = new StringBuilder();
        int i = qs + 1;
        while (i < body.length()) {
            char c = body.charAt(i);
            if (c == '\\' && i + 1 < body.length()) {
                char n = body.charAt(i + 1);
                if (n == '"') { sb.append('"'); i += 2; }
                else if (n == 'n') { sb.append('\n'); i += 2; }
                else if (n == 't') { sb.append('\t'); i += 2; }
                else if (n == '\\') { sb.append('\\'); i += 2; }
                else { sb.append(n); i += 2; }
            } else if (c == '"') break;
            else { sb.append(c); i++; }
        }
        return sb.toString();
    }

    private String toJsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
            .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }
}
