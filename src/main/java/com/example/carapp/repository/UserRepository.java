package com.example.carapp.repository;

import com.example.carapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Email alapján keresés (JWT-es bejelentkezéshez kell)
    Optional<User> findByEmail(String email);
}
