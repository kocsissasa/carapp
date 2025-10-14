package com.example.carapp.controller;

import com.example.carapp.model.Role;
import com.example.carapp.model.User;
import com.example.carapp.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin") // -> Végpontok api/admin alatt elérhetőek
public class AdminController {

    // UserRepository inject az adatbázis műveletekhez
    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Összes felhasználó lekérése CSAK ADMIN jogosultsággal
    @GetMapping("/users")
    public List<User> getAllUsers() { // -> Itt adja vissza az összes USER-t
        return userRepository.findAll();
    }

    // Egy user törlése ID alapján CSAK ADMIN jogosultsággal
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) { // -> ID checkolás, hogy létezik-e
        if (userRepository.existsById(id)) { // Ha igen -> Delete, majd 204 válasz
            userRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build(); // 404-es hiba, ha nincs ilyen ID
    }

    // User szerepkör módosítása CSAK ADMIN jogosultsággal
    @PutMapping("/users/{id}/role")
    public ResponseEntity<User> updateUserRole(
            @PathVariable Long id,
            @RequestParam Role role   // -> itt most már az enum-ot várjuk
    ) {
        return userRepository.findById(id) // -> adatbázisból USER lekéréés
                .map(user -> {
                    user.setRole(role);   // Frissitjük a szerepkörét, ha létezik, majd vissza az adatbázisba
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build()); // 404 Not found, ha nincs
    }
}

