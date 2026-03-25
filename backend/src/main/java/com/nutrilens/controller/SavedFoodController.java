package com.nutrilens.controller;

import com.nutrilens.entity.SavedFood;
import com.nutrilens.entity.User;
import com.nutrilens.repository.SavedFoodRepository;
import com.nutrilens.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/saved-foods")
public class SavedFoodController {

    private final SavedFoodRepository repo;
    private final UserRepository userRepo;

    public SavedFoodController(SavedFoodRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        List<SavedFood> foods = repo.findByUserIdOrderByFoodNameAsc(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (SavedFood f : foods) result.add(toMap(f));
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody Map<String, Object> body, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        User user = userRepo.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        SavedFood f = new SavedFood();
        f.setUser(user);
        f.setFoodName((String) body.getOrDefault("food_name", ""));
        f.setServingSize((String) body.getOrDefault("serving_size", ""));
        f.setCalories(toDouble(body.get("calories")));
        f.setProteinG(toDouble(body.get("protein_g")));
        f.setCarbsG(toDouble(body.get("carbs_g")));
        f.setFatG(toDouble(body.get("fat_g")));
        f.setFiberG(toDouble(body.get("fiber_g")));
        repo.save(f);
        return ResponseEntity.status(201).body(toMap(f));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        repo.findById(id).ifPresent(f -> {
            if (f.getUser().getId().equals(userId)) repo.delete(f);
        });
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toMap(SavedFood f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("food_name", f.getFoodName());
        m.put("serving_size", f.getServingSize() != null ? f.getServingSize() : "");
        m.put("calories", f.getCalories() != null ? f.getCalories() : 0.0);
        m.put("protein_g", f.getProteinG() != null ? f.getProteinG() : 0.0);
        m.put("carbs_g", f.getCarbsG() != null ? f.getCarbsG() : 0.0);
        m.put("fat_g", f.getFatG() != null ? f.getFatG() : 0.0);
        m.put("fiber_g", f.getFiberG() != null ? f.getFiberG() : 0.0);
        return m;
    }

    private Double toDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
}
