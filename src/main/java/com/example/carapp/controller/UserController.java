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

    private final UserRepository userRepository; // -> Adatbázis műveletek
    private final PasswordEncoder passwordEncoder;  // -> Jelszó hash-elés

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
                                                   UriComponentsBuilder uriBuilder) { // -> Location header építéséhez
        User entity = UserMapper.toEntity(req); // -> DTO → Entity
        entity.setPassword(passwordEncoder.encode(entity.getPassword())); // -> Jelszó hash-elése
        User saved = userRepository.save(entity); // -> Mentés DB-be

        URI location = uriBuilder.path("/api/users/{id}") // -> Location header: az új erőforrás URL-je
                .buildAndExpand(saved.getId()).toUri();
        return ResponseEntity.created(location).body(UserMapper.toResponse(saved)); // -> 201 Created + Location + Kimenő DTO (jelszó nélkül)
    }

    // Az összes USER lekérése -> 200 OK
    @GetMapping("")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> list = userRepository.findAll() // -> Összes user
                .stream()
                .map(UserMapper::toResponse) // -> Entity → DTO (jelszó nélkül)
                .toList();
        return ResponseEntity.ok(list); // -> 200 OK
    }

    // ID alapján USER lekérése, ha OK -> 200 OK, ha nem található -> 404 Not Found
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return userRepository.findById(id) // -> Optional<User>
                .map(user -> ResponseEntity.ok(UserMapper.toResponse(user))) // -> 200 OK + DTO
                .orElseGet(() -> ResponseEntity.<UserResponse>notFound().build()); // -> 404
    }

    /**
     * USER adatainak módosítása
     * ha jelszó csere is van, akkor újra hash-elés
     * ha nem létezik -> 404 Not Found
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id,
                                                   @Valid @RequestBody UserRequest req) { // -> Validált bejövő DTO
        return userRepository.findById(id) // -> Meglévő user keresése
                .map(u -> {
                    u.setName(req.getName()); // -> Név frissítése
                    u.setEmail(req.getEmail()); // -> Email frissítése

                    // jelszó csak akkor frissül, ha ténylegesen került létrehozásra új
                    if (req.getPassword() != null && !req.getPassword().isBlank()) {
                        u.setPassword(passwordEncoder.encode(req.getPassword())); // -> Hash újra
                    }
                    User saved = userRepository.save(u); // -> Mentés
                    return ResponseEntity.ok(UserMapper.toResponse(saved)); // -> 200 OK + DTO
                })
                .orElseGet(() -> ResponseEntity.<UserResponse>notFound().build()); // -> 404, ha nincs ilyen user
    }

    // DELETE ID alapján -> 204,ha OK vagy 404, ha NOT Found
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id) // -> Keresés ID alapján
                .map(u -> {
                    userRepository.deleteById(id); // -> Törlés
                    return ResponseEntity.noContent().<Void>build(); // -> 204 No Content
                })
                .orElseGet(() -> ResponseEntity.<Void>notFound().build()); // -> 404
    }
}
