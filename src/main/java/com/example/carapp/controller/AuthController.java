package com.example.carapp.controller;

import com.example.carapp.dto.AuthResponse;
import com.example.carapp.dto.LoginRequest;
import com.example.carapp.dto.UserRequest;
import com.example.carapp.model.User;
import com.example.carapp.repository.UserRepository;
import com.example.carapp.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // ---------- REGISTER ----------
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody UserRequest req) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }
        User u = new User(req.getName(), req.getEmail(), passwordEncoder.encode(req.getPassword()));
        userRepository.save(u);

        String token = jwtService.generateToken(u.getEmail());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    // ---------- LOGIN ----------
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        return userRepository.findByEmail(req.getEmail())
                .map(user -> {
                    if (passwordEncoder.matches(req.getPassword(), user.getPassword())) {
                        String token = jwtService.generateToken(user.getEmail());
                        return ResponseEntity.ok(new AuthResponse(token));
                    }
                    return ResponseEntity.status(401).body("Invalid credentials");
                })
                .orElseGet(() -> ResponseEntity.status(401).body("Invalid credentials"));
    }
}
