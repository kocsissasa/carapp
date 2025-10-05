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

/**
 * E osztály kezeli a regisztrációt és bejelentkezést
 * Új User hozzáadása a DB-hez
 * JWT token generálása
 * Belépés email + jelszóval
 */
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

    /**
     * ---  Új felhasználó létrehozása ---
     *  Ellenőrzi, hogy az email foglalt-e
     *  Jelszót hash-el
     *  Elmenti DB-be
     *  JWT tokent ad
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody UserRequest req) {
        // Ha foglalt az email akkor 400-as hibakódot ad vissza
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        // Új user létrehozása hash-elt jelszóval
        User u = new User(req.getName(), req.getEmail(), passwordEncoder.encode(req.getPassword()));
        userRepository.save(u);

        // Token generálása és visszaadása
        String token = jwtService.generateToken(u.getEmail());
        return ResponseEntity.ok(new AuthResponse(token));
    }


    // ---------- LOGIN ----------
    /**
     * --- Bejelentkezés meglévő user-ként ---
     *  Ellenőrzi, hogy létezik-e az email
     *  Jelszó ellenőrzés
     *  Ha OK -> JWT token
     *
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        return userRepository.findByEmail(req.getEmail())
                .map(user -> {

                    // jelszó ellenrőzése
                    if (passwordEncoder.matches(req.getPassword(), user.getPassword())) {
                        String token = jwtService.generateToken(user.getEmail());
                        return ResponseEntity.ok(new AuthResponse(token));
                    }
                    // Rossz jelszó esetén -> 401 Hiba
                    return ResponseEntity.status(401).body("Invalid credentials");
                })
                // Ha a USER nem létezik -> 401 Hiba
                .orElseGet(() -> ResponseEntity.status(401).body("Invalid credentials"));
    }
}
