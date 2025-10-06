package com.example.carapp.repository;

import com.example.carapp.model.Car;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

//  Örökli az alap CRUD műveleteket (findAll, save, deleteById stb.).
//  Plusz: findByOwnerId → visszaadja az adott felhasználó összes autóját.
//  Ez kell pl. a /me endpointnál.

public interface CarRepository extends JpaRepository<Car, Long> {
    List<Car> findByOwnerId(Long ownerId);   // <<< EZ KELL A /me-hez
}
