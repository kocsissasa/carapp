package com.example.carapp.repository;

import com.example.carapp.model.Car;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CarRepository extends JpaRepository<Car, Long> {
    List<Car> findByOwnerId(Long ownerId);   // <<< EZ KELL A /me-hez
}
