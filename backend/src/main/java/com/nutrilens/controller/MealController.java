package com.nutrilens.controller;

import com.nutrilens.dto.MealRequest;
import com.nutrilens.entity.MealLog;
import com.nutrilens.entity.User;
import com.nutrilens.repository.MealLogRepository;
import com.nutrilens.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/meals")
public class MealController {

    private final MealLogRepository mealRepo;
    private final UserRepository userRepo;

    @Value("${app.gemini.api-key}")
    private String geminiKey;

    public MealController(MealLogRepository mealRepo, UserRepository userRepo) {
        this.mealRepo = mealRepo;
        this.userRepo = userRepo;
    }

    @PostMapping("/analyze-photo")
    public ResponseEntity<?> analyzePhoto(@RequestParam("image") MultipartFile file,
                                          Authentication auth) throws Exception {
        System.out.println("analyze-photo called, file size: " + file.getSize() + " bytes");
        if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No image provided"));

        String base64 = Base64.getEncoder().encodeToString(file.getBytes());
        String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

        String prompt = "You are a nutrition expert. Analyze this food image and respond with ONLY a valid JSON object, no markdown, no explanation. "
            + "JSON format: {\"food_name\":\"name\",\"serving_size\":\"portion\",\"calories\":0,\"protein_g\":0,\"carbs_g\":0,\"fat_g\":0,\"fiber_g\":0,\"items\":[{\"name\":\"item\",\"calories\":0}]}";

        String bodyJson = "{\"contents\":[{\"parts\":["
            + "{\"text\":" + toJsonString(prompt) + "},"
            + "{\"inline_data\":{\"mime_type\":" + toJsonString(mimeType) + ",\"data\":" + toJsonString(base64) + "}}"
            + "]}],\"generationConfig\":{\"temperature\":0.1,\"maxOutputTokens\":512,"
            + "\"thinkingConfig\":{\"thinkingBudget\":0}}}";

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey;

        String respBody = null;
        int[] delays = {5000, 10000, 20000};
        for (int attempt = 0; attempt < 4; attempt++) {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(java.time.Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .build();
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
            respBody = resp.body();
            System.out.println("Gemini status: " + resp.statusCode() + " attempt: " + (attempt + 1));
            if (resp.statusCode() == 200) break;
            if ((resp.statusCode() == 429 || resp.statusCode() == 503) && attempt < delays.length) {
                System.out.println("Gemini rate limit/overload — waiting " + delays[attempt] + "ms");
                Thread.sleep(delays[attempt]);
            } else {
                break;
            }
        }

        String text = extractGeminiText(respBody);
        System.out.println("Gemini text: " + text);

        if (text == null || text.isEmpty()) {
            return ResponseEntity.status(500).body(Map.of("error", "Could not parse nutrition data from AI response"));
        }

        text = text.trim();
        if (text.startsWith("```")) {
            int firstNewline = text.indexOf('\n');
            if (firstNewline >= 0) text = text.substring(firstNewline + 1);
            if (text.endsWith("```")) text = text.substring(0, text.lastIndexOf("```")).trim();
        }

        int jsonStart = text.indexOf("{");
        int jsonEnd = text.lastIndexOf("}") + 1;
        if (jsonStart < 0 || jsonEnd <= jsonStart) {
            return ResponseEntity.status(500).body(Map.of("error", "Could not parse nutrition data from AI response"));
        }

        String jsonStr = text.substring(jsonStart, jsonEnd);
        System.out.println("Final JSON: " + jsonStr);
        return ResponseEntity.ok(jsonStr);
    }

    private String extractGeminiText(String respBody) {
        System.out.println("Gemini raw response: " + respBody);
        int textIdx = -1;
        int searchFrom = 0;
        while (true) {
            int found = respBody.indexOf("\"text\":", searchFrom);
            if (found < 0) break;
            textIdx = found;
            searchFrom = found + 7;
        }
        if (textIdx < 0) return null;
        int quoteStart = respBody.indexOf("\"", textIdx + 7);
        if (quoteStart < 0) return null;
        StringBuilder sb = new StringBuilder();
        int i = quoteStart + 1;
        while (i < respBody.length()) {
            char c = respBody.charAt(i);
            if (c == '\\' && i + 1 < respBody.length()) {
                char next = respBody.charAt(i + 1);
                if (next == '"') { sb.append('"'); i += 2; }
                else if (next == 'n') { sb.append('\n'); i += 2; }
                else if (next == 't') { sb.append('\t'); i += 2; }
                else if (next == '\\') { sb.append('\\'); i += 2; }
                else { sb.append(next); i += 2; }
            } else if (c == '"') {
                break;
            } else {
                sb.append(c); i++;
            }
        }
        return sb.toString();
    }

    @PostMapping
    public ResponseEntity<?> logMeal(@RequestBody MealRequest req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        User user = userRepo.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        MealLog meal = new MealLog();
        meal.setUser(user);
        meal.setMealType(req.getMealType());
        meal.setFoodName(req.getFoodName());
        meal.setCalories(req.getCalories());
        meal.setProteinG(req.getProteinG());
        meal.setCarbsG(req.getCarbsG());
        meal.setFatG(req.getFatG());
        meal.setFiberG(req.getFiberG());
        meal.setServingSize(req.getServingSize());
        meal.setImageUrl(req.getImageUrl());
        meal.setLoggedAt(req.getLoggedAt() != null ? LocalDate.parse(req.getLoggedAt()) : LocalDate.now());

        mealRepo.save(meal);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", meal.getId());
        resp.put("food_name", meal.getFoodName() != null ? meal.getFoodName() : "");
        resp.put("meal_type", meal.getMealType() != null ? meal.getMealType() : "");
        resp.put("calories", meal.getCalories() != null ? meal.getCalories() : 0.0);
        resp.put("protein_g", meal.getProteinG() != null ? meal.getProteinG() : 0.0);
        resp.put("carbs_g", meal.getCarbsG() != null ? meal.getCarbsG() : 0.0);
        resp.put("fat_g", meal.getFatG() != null ? meal.getFatG() : 0.0);
        resp.put("fiber_g", meal.getFiberG() != null ? meal.getFiberG() : 0.0);
        resp.put("serving_size", meal.getServingSize() != null ? meal.getServingSize() : "");
        return ResponseEntity.status(201).body(resp);
    }

    @GetMapping
    public ResponseEntity<?> getMeals(@RequestParam(required = false) String date, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        LocalDate target = date != null ? LocalDate.parse(date) : LocalDate.now();
        List<MealLog> logs = mealRepo.findByUserIdAndLoggedAtOrderByCreatedAtAsc(userId, target);
        List<Map<String, Object>> result = new ArrayList<>();
        for (MealLog m : logs) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", m.getId());
            row.put("food_name", m.getFoodName());
            row.put("meal_type", m.getMealType());
            row.put("serving_size", m.getServingSize() != null ? m.getServingSize() : "");
            row.put("calories", m.getCalories());
            row.put("protein_g", m.getProteinG());
            row.put("carbs_g", m.getCarbsG());
            row.put("fat_g", m.getFatG());
            row.put("fiber_g", m.getFiberG() != null ? m.getFiberG() : 0.0);
            row.put("logged_at", m.getLoggedAt().toString());
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(@RequestParam(required = false) String date, Authentication auth) {
        try {
            Long userId = (Long) auth.getPrincipal();
            LocalDate target = date != null ? LocalDate.parse(date) : LocalDate.now();
            List<Object[]> rows = mealRepo.getDailySummary(userId, target);
            Object[] row = (rows != null && !rows.isEmpty()) ? rows.get(0) : new Object[]{0.0, 0.0, 0.0, 0.0, 0.0, 0L};
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("total_calories", row[0] != null ? ((Number) row[0]).doubleValue() : 0.0);
            summary.put("total_protein",  row[1] != null ? ((Number) row[1]).doubleValue() : 0.0);
            summary.put("total_carbs",    row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);
            summary.put("total_fat",      row[3] != null ? ((Number) row[3]).doubleValue() : 0.0);
            summary.put("total_fiber",    row[4] != null ? ((Number) row[4]).doubleValue() : 0.0);
            summary.put("meal_count",     row[5] != null ? ((Number) row[5]).longValue() : 0L);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            System.err.println("Summary error: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("total_calories", 0.0);
            empty.put("total_protein", 0.0);
            empty.put("total_carbs", 0.0);
            empty.put("total_fat", 0.0);
            empty.put("total_fiber", 0.0);
            empty.put("meal_count", 0L);
            return ResponseEntity.ok(empty);
        }
    }

    @GetMapping("/barcode/{barcode}")
    public ResponseEntity<?> lookupBarcode(@PathVariable String barcode, Authentication auth) throws Exception {
        String url = "https://world.openfoodfacts.org/api/v0/product/" + barcode + ".json";

        String body = null;
        int statusCode = 0;
        for (int attempt = 0; attempt < 3; attempt++) {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "NutriLens/1.0")
                .GET().build();
            HttpResponse<String> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            statusCode = resp.statusCode();
            body = resp.body();
            System.out.println("OFF status code: " + statusCode + " attempt: " + (attempt + 1));
            if (statusCode != 429) break;
            Thread.sleep(1500);
        }

        if (statusCode == 429) {
            return ResponseEntity.status(503).body(Map.of("error", "Too many requests, please try again in a moment"));
        }
        if (statusCode != 200) {
            return ResponseEntity.status(404).body(Map.of("error", "Product not found"));
        }

        System.out.println("OFF body snippet: " + body.substring(0, Math.min(200, body.length())));

        // OFF returns "status": 1 (with or without space) when found
        if (!body.contains("\"status\":1") && !body.contains("\"status\": 1")) {
            return ResponseEntity.status(404).body(Map.of("error", "Product not found"));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("food_name", extractOFF(body, "product_name", "Unknown Product"));
        result.put("serving_size", extractOFF(body, "serving_size", "100g"));

        double servingG = parseServingGrams(extractOFF(body, "serving_size", "100"));
        double factor = servingG / 100.0;

        result.put("calories",  parseDouble(extractOFF(body, "energy-kcal_100g", extractOFF(body, "energy_100g", "0"))) * factor);
        result.put("protein_g", parseDouble(extractOFF(body, "proteins_100g", "0")) * factor);
        result.put("carbs_g",   parseDouble(extractOFF(body, "carbohydrates_100g", "0")) * factor);
        result.put("fat_g",     parseDouble(extractOFF(body, "fat_100g", "0")) * factor);
        result.put("fiber_g",   parseDouble(extractOFF(body, "fiber_100g", "0")) * factor);
        result.put("items",     new ArrayList<>());

        return ResponseEntity.ok(result);
    }

    private String extractOFF(String json, String key, String fallback) {
        String search = "\"" + key + "\":";
        int idx = json.indexOf(search);
        if (idx < 0) return fallback;
        int start = idx + search.length();
        while (start < json.length() && json.charAt(start) == ' ') start++;
        if (start >= json.length()) return fallback;
        char first = json.charAt(start);
        if (first == '"') {
            int end = json.indexOf('"', start + 1);
            return end > start ? json.substring(start + 1, end) : fallback;
        } else {
            int end = start;
            while (end < json.length() && ",}\n".indexOf(json.charAt(end)) < 0) end++;
            String val = json.substring(start, end).trim();
            return val.isEmpty() || val.equals("null") ? fallback : val;
        }
    }

    private double parseDouble(String s) {
        try { return Double.parseDouble(s.replaceAll("[^0-9.]", "")); } catch (Exception e) { return 0; }
    }

    private double parseServingGrams(String serving) {
        if (serving == null || serving.isEmpty()) return 100;
        try {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\(?(\\d+\\.?\\d*)\\s*g\\)?").matcher(serving.toLowerCase());
            if (m.find()) return Double.parseDouble(m.group(1));
            java.util.regex.Matcher m2 = java.util.regex.Pattern.compile("(\\d+\\.?\\d*)").matcher(serving);
            if (m2.find()) {
                double val = Double.parseDouble(m2.group(1));
                return val > 0 ? val : 100;
            }
        } catch (Exception e) { /* fall through */ }
        return 100;
    }

    private String toJsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
            .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMeal(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        mealRepo.findById(id).ifPresent(m -> {
            if (m.getUser().getId().equals(userId)) mealRepo.delete(m);
        });
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ── Recipe Scanner ────────────────────────────────────────────────────────
    @PostMapping("/scan-recipe")
    public ResponseEntity<?> scanRecipe(@RequestParam("image") MultipartFile file,
                                        Authentication auth) throws Exception {
        if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No image provided"));

        String base64 = Base64.getEncoder().encodeToString(file.getBytes());
        String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

        String prompt = "You are a nutrition expert. This image shows a recipe (text, card, screenshot, or handwritten). "
            + "Extract ALL ingredients and calculate the total nutrition for the entire recipe AND per serving (assume 4 servings if not specified). "
            + "Respond ONLY with a valid JSON object, no markdown. "
            + "Format: {\"recipe_name\":\"name\",\"servings\":4,\"ingredients\":[{\"name\":\"ingredient\",\"amount\":\"100g\"}],"
            + "\"per_serving\":{\"calories\":0,\"protein_g\":0,\"carbs_g\":0,\"fat_g\":0,\"fiber_g\":0},"
            + "\"total\":{\"calories\":0,\"protein_g\":0,\"carbs_g\":0,\"fat_g\":0,\"fiber_g\":0}}";

        String bodyJson = "{\"contents\":[{\"parts\":["
            + "{\"text\":" + toJsonString(prompt) + "},"
            + "{\"inline_data\":{\"mime_type\":" + toJsonString(mimeType) + ",\"data\":" + toJsonString(base64) + "}}"
            + "]}],\"generationConfig\":{\"temperature\":0.1,\"maxOutputTokens\":1024,"
            + "\"thinkingConfig\":{\"thinkingBudget\":0}}}";

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey;
        HttpRequest req = HttpRequest.newBuilder().uri(URI.create(url))
            .header("Content-Type", "application/json")
            .timeout(java.time.Duration.ofSeconds(45))
            .POST(HttpRequest.BodyPublishers.ofString(bodyJson)).build();
        HttpResponse<String> resp = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(10)).build()
            .send(req, HttpResponse.BodyHandlers.ofString());

        String text = extractGeminiText(resp.body());
        if (text == null || text.isEmpty())
            return ResponseEntity.status(500).body(Map.of("error", "Could not parse recipe"));

        text = text.trim();
        if (text.startsWith("```")) {
            int nl = text.indexOf('\n');
            if (nl >= 0) text = text.substring(nl + 1);
            if (text.endsWith("```")) text = text.substring(0, text.lastIndexOf("```")).trim();
        }
        int jsonStart = text.indexOf("{");
        int jsonEnd = text.lastIndexOf("}") + 1;
        if (jsonStart < 0 || jsonEnd <= jsonStart)
            return ResponseEntity.status(500).body(Map.of("error", "Could not parse recipe data"));

        return ResponseEntity.ok(text.substring(jsonStart, jsonEnd));
    }

    // ── Voice Log ─────────────────────────────────────────────────────────────
    @PostMapping("/voice-log")
    public ResponseEntity<?> voiceLog(@RequestBody Map<String, Object> body, Authentication auth) throws Exception {
        String transcript = (String) body.getOrDefault("transcript", "");
        String audioBase64 = (String) body.getOrDefault("audio_base64", "");

        String prompt;
        String bodyJson;
        // Use 1.5-flash for text transcript (higher quota), 2.5-flash for audio (multimodal)
        String url;

        if (!audioBase64.isEmpty()) {
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey;
            prompt = "You are a nutrition expert. The user recorded themselves describing what they ate. "
                + "Listen to the audio and extract all food items with nutrition estimates. "
                + "Respond ONLY with a valid JSON array, no markdown. "
                + "Format: [{\"food_name\":\"name\",\"serving_size\":\"portion\",\"meal_type\":\"breakfast|lunch|dinner|snack\","
                + "\"calories\":0,\"protein_g\":0,\"carbs_g\":0,\"fat_g\":0,\"fiber_g\":0}]";
            bodyJson = "{\"contents\":[{\"parts\":["
                + "{\"text\":" + toJsonString(prompt) + "},"
                + "{\"inline_data\":{\"mime_type\":\"audio/m4a\",\"data\":" + toJsonString(audioBase64) + "}}"
                + "]}],\"generationConfig\":{\"temperature\":0.1,\"maxOutputTokens\":512}}";
        } else if (!transcript.isBlank()) {
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey;
            prompt = "You are a nutrition expert. The user described what they ate in natural language. "
                + "Extract the food items and estimate nutrition. "
                + "Respond ONLY with a valid JSON array, no markdown. "
                + "Format: [{\"food_name\":\"name\",\"serving_size\":\"portion\",\"meal_type\":\"breakfast|lunch|dinner|snack\","
                + "\"calories\":0,\"protein_g\":0,\"carbs_g\":0,\"fat_g\":0,\"fiber_g\":0}] "
                + "If multiple foods are mentioned, return multiple objects. "
                + "User said: \"" + transcript.replace("\"", "'") + "\"";
            bodyJson = "{\"contents\":[{\"parts\":[{\"text\":" + toJsonString(prompt) + "}]}],"
                + "\"generationConfig\":{\"temperature\":0.1,\"maxOutputTokens\":512}}";
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Provide transcript or audio_base64"));
        }

        HttpRequest req = HttpRequest.newBuilder().uri(URI.create(url))
            .header("Content-Type", "application/json")
            .timeout(java.time.Duration.ofSeconds(45))
            .POST(HttpRequest.BodyPublishers.ofString(bodyJson)).build();
        HttpResponse<String> resp = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(10)).build()
            .send(req, HttpResponse.BodyHandlers.ofString());

        String text = extractGeminiText(resp.body());
        if (text == null || text.isEmpty())
            return ResponseEntity.status(500).body(Map.of("error", "Could not parse food from voice"));

        text = text.trim();
        if (text.startsWith("```")) {
            int nl = text.indexOf('\n');
            if (nl >= 0) text = text.substring(nl + 1);
            if (text.endsWith("```")) text = text.substring(0, text.lastIndexOf("```")).trim();
        }
        int start = text.indexOf("[");
        int end = text.lastIndexOf("]") + 1;
        if (start < 0 || end <= start)
            return ResponseEntity.status(500).body(Map.of("error", "Could not parse food items"));

        return ResponseEntity.ok(text.substring(start, end));
    }
}
