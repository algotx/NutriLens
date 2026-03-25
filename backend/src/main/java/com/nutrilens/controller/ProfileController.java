package com.nutrilens.controller;

import com.nutrilens.dto.ProfileRequest;
import com.nutrilens.entity.User;
import com.nutrilens.entity.UserProfile;
import com.nutrilens.repository.UserProfileRepository;
import com.nutrilens.repository.UserRepository;
import com.nutrilens.util.MacroCalculator;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserProfileRepository profileRepo;
    private final UserRepository userRepo;
    private final MacroCalculator macroCalc;

    public ProfileController(UserProfileRepository profileRepo, UserRepository userRepo, MacroCalculator macroCalc) {
        this.profileRepo = profileRepo;
        this.userRepo = userRepo;
        this.macroCalc = macroCalc;
    }

    @GetMapping
    public ResponseEntity<?> getProfile(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        // If user doesn't exist in DB (e.g. stale token after DB reset), return 401
        if (!userRepo.existsById(userId)) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }
        Optional<UserProfile> profile = profileRepo.findByUserId(userId);
        return profile.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.ok(null));
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody ProfileRequest req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        User user = userRepo.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        UserProfile profile = profileRepo.findByUserId(userId).orElse(new UserProfile());
        profile.setUser(user);
        profile.setAge(req.getAge());
        profile.setGender(req.getGender());
        profile.setHeightCm(req.getHeightCm());
        profile.setWeightKg(req.getWeightKg());
        profile.setActivityLevel(req.getActivityLevel());
        profile.setGoal(req.getGoal());
        profile.setGoalWeightKg(req.getGoalWeightKg());
        profile.setWeeklyGoalKg(req.getWeeklyGoalKg());
        profile.setDietaryPreference(req.getDietaryPreference());
        profile.setUpdatedAt(LocalDateTime.now());

        macroCalc.calculate(profile);
        profileRepo.save(profile);
        return ResponseEntity.ok(profile);
    }
}
