package com.nutrilens.controller;

import com.nutrilens.dto.AuthRequest;
import com.nutrilens.entity.User;
import com.nutrilens.repository.UserRepository;
import com.nutrilens.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepo, PasswordEncoder encoder, JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.encoder = encoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        if (req.getEmail() == null || req.getPassword() == null || req.getName() == null)
            return ResponseEntity.badRequest().body(Map.of("error", "email, password, and name are required"));

        if (userRepo.existsByEmail(req.getEmail()))
            return ResponseEntity.status(409).body(Map.of("error", "Email already in use"));

        User user = new User();
        user.setEmail(req.getEmail());
        user.setName(req.getName());
        user.setPasswordHash(encoder.encode(req.getPassword()));
        userRepo.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return ResponseEntity.status(201).body(Map.of(
            "token", token,
            "user", Map.of("id", user.getId(), "email", user.getEmail(), "name", user.getName())
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        Optional<User> opt = userRepo.findByEmail(req.getEmail());
        if (opt.isEmpty() || !encoder.matches(req.getPassword(), opt.get().getPasswordHash()))
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));

        User user = opt.get();
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return ResponseEntity.ok(Map.of(
            "token", token,
            "user", Map.of("id", user.getId(), "email", user.getEmail(), "name", user.getName())
        ));
    }
}
