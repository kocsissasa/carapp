package com.example.carapp.controller;

import com.example.carapp.model.Role;
import com.example.carapp.model.User;
import com.example.carapp.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Összes felhasználó lekérése CSAK ADMIN jogosultsággal
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Egy user törlése ID alapján CSAK ADMIN jogosultsággal
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    // User szerepkör módosítása CSAK ADMIN jogosultsággal
    @PutMapping("/users/{id}/role")
    public ResponseEntity<User> updateUserRole(
            @PathVariable Long id,
            @RequestParam Role role   // <<< itt most már az enumot várjuk
    ) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setRole(role);   // Role enum értéke
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

