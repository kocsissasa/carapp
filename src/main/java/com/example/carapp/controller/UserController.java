package com.example.carapp.controller;

import com.example.carapp.dto.UserRequest;
import com.example.carapp.dto.UserResponse;
import com.example.carapp.dto.UserMapper;
import com.example.carapp.model.User;
import com.example.carapp.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Ez az osztály kezeli a felhasználók CRUD műveleteit.
 * DTO-k (UserRequest, UserResponse)  dolgozik,
 * jelszó nem kerül visszaadásra.
 */

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * New user létrehozása
     * 201 created kóddal tér vissza
     * jelszó hash-elése
     */

    @PostMapping("")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest req,
                                                   UriComponentsBuilder uriBuilder) {
        User entity = UserMapper.toEntity(req);
        entity.setPassword(passwordEncoder.encode(entity.getPassword()));
        User saved = userRepository.save(entity);

        URI location = uriBuilder.path("/api/users/{id}")
                .buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(UserMapper.toResponse(saved));
    }

    // Az összes USER lekérése -> 200 OK
    @GetMapping("")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> list = userRepository.findAll()
                .stream()
                .map(UserMapper::toResponse)
                .toList();
        return ResponseEntity.ok(list);
    }

    // ID alapján USER lekérése, ha OK -> 200 OK, ha nem található -> 404 Not Found
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(UserMapper.toResponse(user)))
                .orElseGet(() -> ResponseEntity.<UserResponse>notFound().build());
    }

    /**
     * USER adatainak módosítása
     * ha jelszó csere is van, akkor újra hash-elés
     * ha nem létezik -> 404 Not Found
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id,
                                                   @Valid @RequestBody UserRequest req) {
        return userRepository.findById(id)
                .map(u -> {
                    u.setName(req.getName());
                    u.setEmail(req.getEmail());

                    // jelszó csak akkor frissül, ha ténylegesen került létrehozásra új
                    if (req.getPassword() != null && !req.getPassword().isBlank()) {
                        u.setPassword(passwordEncoder.encode(req.getPassword()));
                    }
                    User saved = userRepository.save(u);
                    return ResponseEntity.ok(UserMapper.toResponse(saved));
                })
                .orElseGet(() -> ResponseEntity.<UserResponse>notFound().build());
    }

    // DELETE ID alapján -> 204,ha OK vagy 404, ha NOT Found
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(u -> {
                    userRepository.deleteById(id);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.<Void>notFound().build());
    }
}
