package com.nutrilens.controller;

import com.nutrilens.repository.MealLogRepository;
import com.nutrilens.repository.UserProfileRepository;
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
    private final UserProfileRepository profileRepo;

    @Value("${app.gemini.api-key}")
    private String geminiKey;

    public InsightsController(MealLogRepository mealRepo, UserRepository userRepo, UserProfileRepository profileRepo) {
        this.mealRepo = mealRepo;
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
    }

    // ── Shared Gemini helper with retry ──────────────────────────────────────
    private String callGemini(String prompt, int maxTokens, double temperature) throws Exception {
        String bodyJson = "{\"contents\":[{\"parts\":[{\"text\":" + toJsonString(prompt) + "}]}],"
            + "\"generationConfig\":{\"temperature\":" + temperature + ",\"maxOutputTokens\":" + maxTokens + "}}";
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey;

        int[] delays = {3000, 8000, 15000}; // retry after 3s, 8s, 15s
        Exception lastEx = null;

        for (int attempt = 0; attempt <= delays.length; attempt++) {
            try {
                HttpRequest req = HttpRequest.newBuilder().uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(java.time.Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson)).build();
                HttpResponse<String> resp = HttpClient.newBuilder()
                    .connectTimeout(java.time.Duration.ofSeconds(10)).build()
                    .send(req, HttpResponse.BodyHandlers.ofString());

                System.out.println("Gemini status: " + resp.statusCode() + " attempt: " + (attempt + 1));

                if (resp.statusCode() == 200) {
                    String text = extractText(resp.body());
                    System.out.println("Gemini text length: " + (text != null ? text.length() : "null"));
                    return text;
                }

                if (resp.statusCode() == 429 && attempt < delays.length) {
                    System.out.println("Gemini 429 rate limit — waiting " + delays[attempt] + "ms before retry");
                    Thread.sleep(delays[attempt]);
                    continue;
                }

                // Non-retryable error
                String snippet = resp.body().substring(0, Math.min(300, resp.body().length()));
                System.err.println("Gemini error " + resp.statusCode() + ": " + snippet);
                throw new RuntimeException("Gemini API error " + resp.statusCode() + ": " + snippet);

            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                lastEx = e;
                if (attempt < delays.length) {
                    System.out.println("Gemini request failed (" + e.getMessage() + ") — retrying in " + delays[attempt] + "ms");
                    Thread.sleep(delays[attempt]);
                }
            }
        }
        throw lastEx != null ? lastEx : new RuntimeException("Gemini request failed after retries");
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

    // ── Meal Plan Generator ───────────────────────────────────────────────────
    @PostMapping("/meal-plan")
    public ResponseEntity<?> mealPlan(@RequestBody Map<String, Object> body, Authentication auth) {
        try {
        Long userId = (Long) auth.getPrincipal();
        com.nutrilens.entity.UserProfile profile = profileRepo.findByUserId(userId).orElse(null);

        String dietPref = (profile != null && profile.getDietaryPreference() != null) ? profile.getDietaryPreference() : "none";
        String goal     = (profile != null && profile.getGoal() != null) ? profile.getGoal() : "maintain";
        int calories    = (profile != null && profile.getDailyCalories() != null) ? profile.getDailyCalories() : 2000;
        int protein     = (profile != null && profile.getDailyProteinG() != null) ? profile.getDailyProteinG() : 150;
        int carbs       = (profile != null && profile.getDailyCarbsG()  != null) ? profile.getDailyCarbsG()  : 200;
        int fat         = (profile != null && profile.getDailyFatG()    != null) ? profile.getDailyFatG()    : 65;

        String prompt = "You are a professional nutritionist. Generate a 7-day meal plan. "
            + "Daily targets: " + calories + " kcal, " + protein + "g protein, " + carbs + "g carbs, " + fat + "g fat. "
            + "Goal: " + goal.replace("_", " ") + ". Diet: " + dietPref + ". "
            + "Respond ONLY with a valid JSON array of 7 objects, no markdown. "
            + "Each object: {\"day\":\"Monday\",\"meals\":[{\"type\":\"breakfast\",\"name\":\"Meal name\",\"calories\":0,\"protein_g\":0,\"carbs_g\":0,\"fat_g\":0,\"description\":\"brief prep note\"}]}. "
            + "Include breakfast, lunch, dinner, snack for each day. Keep meals realistic and varied.";

        String answer = callGemini(prompt, 8192, 0.7);
        if (answer == null) return ResponseEntity.status(500).body(Map.of("error", "Could not generate meal plan"));

        answer = answer.trim();
        if (answer.startsWith("```")) {
            int nl = answer.indexOf('\n');
            if (nl >= 0) answer = answer.substring(nl + 1);
            if (answer.endsWith("```")) answer = answer.substring(0, answer.lastIndexOf("```")).trim();
        }
        int start = answer.indexOf("[");
        int end = answer.lastIndexOf("]") + 1;
        if (start < 0 || end <= start) return ResponseEntity.status(500).body(Map.of("error", "Could not parse meal plan"));

        String jsonStr = answer.substring(start, end);
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<Object> plan = mapper.readValue(jsonStr, new com.fasterxml.jackson.core.type.TypeReference<List<Object>>(){});
            return ResponseEntity.ok(plan);
        } catch (Exception e) {
            return ResponseEntity.ok(jsonStr);
        }
        } catch (Exception e) {
            System.err.println("Meal plan error: " + e.getClass().getName() + ": " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Meal plan generation failed"));
        }
    }

    // ── Smart Meal Suggestions ────────────────────────────────────────────────
    @GetMapping("/suggestions")
    public ResponseEntity<?> suggestions(Authentication auth) {
        try {
        Long userId = (Long) auth.getPrincipal();
        com.nutrilens.entity.UserProfile profile = profileRepo.findByUserId(userId).orElse(null);

        LocalDate today = LocalDate.now();
        List<Object[]> rows = mealRepo.getDailySummary(userId, today);
        Object[] r = (rows != null && !rows.isEmpty()) ? rows.get(0) : new Object[]{0.0,0.0,0.0,0.0,0.0,0L};

        double eaten = toD(r[0]);
        double proteinEaten = toD(r[1]);
        double carbsEaten = toD(r[2]);
        double fatEaten = toD(r[3]);

        int goalCal     = (profile != null && profile.getDailyCalories() != null) ? profile.getDailyCalories() : 2000;
        int goalProtein = (profile != null && profile.getDailyProteinG() != null) ? profile.getDailyProteinG() : 150;
        int goalCarbs   = (profile != null && profile.getDailyCarbsG()  != null) ? profile.getDailyCarbsG()  : 200;
        int goalFat     = (profile != null && profile.getDailyFatG()    != null) ? profile.getDailyFatG()    : 65;
        String dietPref = (profile != null && profile.getDietaryPreference() != null) ? profile.getDietaryPreference() : "none";

        double remaining   = goalCal     - eaten;
        double proteinLeft = goalProtein - proteinEaten;
        double carbsLeft   = goalCarbs   - carbsEaten;
        double fatLeft     = goalFat     - fatEaten;

        if (remaining <= 0) {
            return ResponseEntity.ok(Map.of(
                "remaining_calories", 0, "remaining_protein_g", 0,
                "remaining_carbs_g", 0, "remaining_fat_g", 0,
                "message", "You've hit your calorie goal for today! Great work.",
                "suggestions", new ArrayList<>()
            ));
        }

        String prompt = "You are a nutrition expert. Suggest 4 specific meals or snacks that fit these remaining macros. "
            + "Remaining today: " + Math.round(remaining) + " kcal, " + Math.round(proteinLeft) + "g protein, "
            + Math.round(carbsLeft) + "g carbs, " + Math.round(fatLeft) + "g fat. "
            + "Diet preference: " + dietPref + ". "
            + "Respond ONLY with a valid JSON array, no markdown. "
            + "Format: [{\"name\":\"Food name\",\"calories\":0,\"protein_g\":0,\"carbs_g\":0,\"fat_g\":0,\"serving\":\"portion size\",\"why\":\"one sentence why this fits\"}]";

        String answer = callGemini(prompt, 800, 0.5);
        if (answer == null) return ResponseEntity.status(500).body(Map.of("error", "Gemini returned empty response"));

        answer = answer.trim();
        if (answer.startsWith("```")) {
            int nl = answer.indexOf('\n');
            if (nl >= 0) answer = answer.substring(nl + 1);
            if (answer.endsWith("```")) answer = answer.substring(0, answer.lastIndexOf("```")).trim();
        }
        int start = answer.indexOf("[");
        int end = answer.lastIndexOf("]") + 1;
        String suggestionsJson = (start >= 0 && end > start) ? answer.substring(start, end) : "[]";

        List<Object> suggestionsList = new ArrayList<>();
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            suggestionsList = mapper.readValue(suggestionsJson, new com.fasterxml.jackson.core.type.TypeReference<List<Object>>(){});
        } catch (Exception ignored) {}

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("remaining_calories", Math.round(remaining));
        result.put("remaining_protein_g", Math.round(proteinLeft));
        result.put("remaining_carbs_g", Math.round(carbsLeft));
        result.put("remaining_fat_g", Math.round(fatLeft));
        result.put("suggestions", suggestionsList);
        return ResponseEntity.ok(result);

        } catch (Exception e) {
            System.err.println("Suggestions error: " + e.getClass().getName() + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    // ── Weekly Progress Report ────────────────────────────────────────────────
    @GetMapping("/weekly-report")
    public ResponseEntity<?> weeklyReport(Authentication auth) throws Exception {
        Long userId = (Long) auth.getPrincipal();
        com.nutrilens.entity.UserProfile profile = profileRepo.findByUserId(userId).orElse(null);

        StringBuilder ctx = new StringBuilder();
        if (profile != null) {
            ctx.append("User profile: goal=").append(profile.getGoal())
               .append(", daily_calories=").append(profile.getDailyCalories())
               .append(", daily_protein=").append(profile.getDailyProteinG()).append("g\n\n");
        }
        ctx.append("Last 7 days nutrition log:\n");

        LocalDate today = LocalDate.now();
        int daysLogged = 0;
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            List<Object[]> rows = mealRepo.getDailySummary(userId, date);
            if (rows != null && !rows.isEmpty() && rows.get(0)[5] != null
                    && ((Number) rows.get(0)[5]).longValue() > 0) {
                Object[] r = rows.get(0);
                ctx.append(String.format("%s (%s): %.0f kcal, P:%.0fg, C:%.0fg, F:%.0fg\n",
                    date, date.getDayOfWeek().toString().substring(0, 3),
                    toD(r[0]), toD(r[1]), toD(r[2]), toD(r[3])));
                daysLogged++;
            } else {
                ctx.append(date).append(" (").append(date.getDayOfWeek().toString().substring(0, 3)).append("): not logged\n");
            }
        }

        if (daysLogged < 2) {
            return ResponseEntity.ok(Map.of("report", "Log at least 2 days of meals to get your weekly report."));
        }

        String prompt = "You are an expert nutrition coach. Analyze this user's week and write a personalized progress report. "
            + "Be specific, mention actual numbers, identify patterns (e.g. low protein on certain days), "
            + "give 3 concrete actionable tips. Keep it under 200 words. Do not use markdown or bullet points.\n\n"
            + ctx;

        String report = callGemini(prompt, 400, 0.7);
        if (report == null) return ResponseEntity.status(500).body(Map.of("error", "Could not generate report"));
        return ResponseEntity.ok(Map.of("report", report, "days_logged", daysLogged));
    }

    // ── AI Coach chat ─────────────────────────────────────────────────────────
    @PostMapping("/coach")
    public ResponseEntity<?> coach(@RequestBody Map<String, Object> body, Authentication auth) throws Exception {
        Long userId = (Long) auth.getPrincipal();
        String question = (String) body.getOrDefault("question", "");
        if (question.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Question is required"));

        StringBuilder ctx = new StringBuilder("User's nutrition data (last 7 days):\n");
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

        String answer = callGemini(prompt, 300, 0.7);
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
