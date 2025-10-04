package com.example.carapp.controller;

import com.example.carapp.model.Car;
import com.example.carapp.model.User;
import com.example.carapp.repository.CarRepository;
import com.example.carapp.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/cars")
public class CarController {

    private final CarRepository carRepository;
    private final UserRepository userRepository;

    public CarController(CarRepository carRepository, UserRepository userRepository) {
        this.carRepository = carRepository;
        this.userRepository = userRepository;
    }

    // Összes autó (pl. adminnak)
    @GetMapping
    public List<Car> getAllCars() {
        return carRepository.findAll();
    }

    // Egy autó ID alapján
    @GetMapping("/{id}")
    public ResponseEntity<Car> getCarById(@PathVariable Long id) {
        return carRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // SAJÁT autók (bejelentkezett user)
    @GetMapping("/me")
    public ResponseEntity<List<Car>> myCars(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String email = authentication.getName();
        User owner = userRepository.findByEmail(email).orElse(null);
        if (owner == null) {
            return ResponseEntity.badRequest().build();
        }
        List<Car> cars = carRepository.findByOwnerId(owner.getId());
        return ResponseEntity.ok(cars);
    }

    // Új autó létrehozása (a bejelentkezett userhez kötve)
    @PostMapping
    public ResponseEntity<Car> createCar(@RequestBody Car car, Authentication auth) {
        String email = auth.getName();
        User owner = userRepository.findByEmail(email).orElse(null);
        if (owner == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        car.setOwner(owner);
        return ResponseEntity.ok(carRepository.save(car));
    }

    // Autó frissítése (csak a sajátját)
    @PutMapping("/{id}")
    public ResponseEntity<Car> updateCar(@PathVariable Long id,
                                         @RequestBody Car updatedCar,
                                         Authentication auth) {
        String email = auth.getName();
        User owner = userRepository.findByEmail(email).orElse(null);

        return carRepository.findById(id).map(car -> {
            if (owner == null || !car.getOwner().getId().equals(owner.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).<Car>build();
            }
            car.setBrand(updatedCar.getBrand());
            car.setModel(updatedCar.getModel());
            car.setYear(updatedCar.getYear());
            return ResponseEntity.ok(carRepository.save(car));
        }).orElseGet(() -> ResponseEntity.notFound().<Car>build());
    }

    // Autó törlése (csak a sajátját)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCar(@PathVariable Long id, Authentication auth) {
        String email = auth.getName();
        User owner = userRepository.findByEmail(email).orElse(null);

        return carRepository.findById(id)
                .<ResponseEntity<Void>>map(car -> {
                    if (owner == null || !Objects.equals(car.getOwner().getId(), owner.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Void>build();
                    }
                    carRepository.deleteById(id);
                    return ResponseEntity.noContent().build();
                })
                .orElseGet(() -> ResponseEntity.notFound().<Void>build());
    }
}
