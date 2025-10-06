package com.example.carapp.controller;

import com.example.carapp.model.AppointmentStatus;
import com.example.carapp.model.ServiceAppointment;
import com.example.carapp.model.ServiceCenter;
import com.example.carapp.model.User;
import com.example.carapp.repository.CarRepository;
import com.example.carapp.repository.ServiceAppointmentRepository;
import com.example.carapp.repository.ServiceCenterRepository;
import com.example.carapp.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * ServiceAppointmentController
 * ---------------------------
 * Szervizidőpontok kezelése (CRUD jellegű műveletek).
 * Újítás: foglaláskor kötelező megadni a ServiceCenter-t is.
 */
@RestController
@RequestMapping("/api/appointments")
public class ServiceAppointmentController {

    private final ServiceAppointmentRepository appointmentRepository;
    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final ServiceCenterRepository centerRepository;

    public ServiceAppointmentController(ServiceAppointmentRepository appointmentRepository,
                                        CarRepository carRepository,
                                        UserRepository userRepository,
                                        ServiceCenterRepository centerRepository) {
        this.appointmentRepository = appointmentRepository;
        this.carRepository = carRepository;
        this.userRepository = userRepository;
        this.centerRepository = centerRepository;
    }

    // ADMIN: összes időpont
    @GetMapping
    public List<ServiceAppointment> getAll() {
        return appointmentRepository.findAll();
    }

    // USER: saját időpontok listázása
    @GetMapping("/me")
    public ResponseEntity<List<ServiceAppointment>> myAppointments(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return userRepository.findByEmail(auth.getName())
                .map(me -> ResponseEntity.ok(appointmentRepository.findByUser(me)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }

    // USER: új időpont foglalása (Saját autó + kötelező ServiceCenter)
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody ServiceAppointment req, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return userRepository.findByEmail(auth.getName())
                .<ResponseEntity<?>>map(user -> {
                    // --- Autó ellenőrzés ---
                    if (req.getCar() == null || req.getCar().getId() == null) {
                        return ResponseEntity.badRequest().body("Car id is required");
                    }
                    var carOpt = carRepository.findById(req.getCar().getId());
                    if (carOpt.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Car not found");
                    }
                    var car = carOpt.get();
                    if (!Objects.equals(car.getOwner().getId(), user.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not your car");
                    }

                    // --- ServiceCenter ellenőrzés (ÚJ) ---
                    if (req.getCenter() == null || req.getCenter().getId() == null) {
                        return ResponseEntity.badRequest().body("Service center id is required");
                    }
                    var centerOpt = centerRepository.findById(req.getCenter().getId());
                    if (centerOpt.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Service center not found");
                    }
                    ServiceCenter center = centerOpt.get();

                    // --- Ütközés ellenőrzés (egyszerű) ---
                    if (appointmentRepository.existsByCar_IdAndServiceDateTime(
                            car.getId(), req.getServiceDateTime())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).body("Time slot already booked for this car");
                    }

                    // --- Mentés ---
                    var appt = new ServiceAppointment();
                    appt.setCar(car);
                    appt.setUser(user);
                    appt.setCenter(center); // ÚJ: beállítjuk a választott szervizt
                    appt.setServiceDateTime(req.getServiceDateTime());
                    appt.setDescription(req.getDescription());
                    appt.setStatus(AppointmentStatus.PENDING);
                    appt.setCreatedAt(LocalDateTime.now());

                    return ResponseEntity.ok(appointmentRepository.save(appt));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.FORBIDDEN).body("User not found"));
    }

    // USER: saját időpont módosítása (leírás/dátum/center) amíg PENDING
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody ServiceAppointment updated,
                                    Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var me = userRepository.findByEmail(auth.getName()).orElse(null);
        if (me == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return appointmentRepository.findById(id)
                .<ResponseEntity<?>>map(appt -> {
                    if (!Objects.equals(appt.getUser().getId(), me.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not your appointment");
                    }
                    if (appt.getStatus() != AppointmentStatus.PENDING) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).body("Only PENDING appointments can be edited");
                    }

                    // Dátumváltoztatás esetén ütközés-ellenőrzés
                    if (updated.getServiceDateTime() != null &&
                            appointmentRepository.existsByCar_IdAndServiceDateTime(
                                    appt.getCar().getId(), updated.getServiceDateTime())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).body("Time slot already booked for this car");
                    }

                    // Leírás frissítés
                    if (updated.getDescription() != null && !updated.getDescription().isBlank()) {
                        appt.setDescription(updated.getDescription());
                    }
                    // Dátum frissítés
                    if (updated.getServiceDateTime() != null) {
                        appt.setServiceDateTime(updated.getServiceDateTime());
                    }
                    // Szerviz (center) frissítés (ÚJ – opcionális)
                    if (updated.getCenter() != null && updated.getCenter().getId() != null) {
                        var centerOpt = centerRepository.findById(updated.getCenter().getId());
                        if (centerOpt.isEmpty()) {
                            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Service center not found");
                        }
                        appt.setCenter(centerOpt.get());
                    }

                    return ResponseEntity.ok(appointmentRepository.save(appt));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // USER: saját időpont lemondása (CANCELLED) – soft delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var me = userRepository.findByEmail(auth.getName()).orElse(null);
        if (me == null) {
            return ResponseEntity.<Void>status(HttpStatus.FORBIDDEN).build();
        }

        return appointmentRepository.findById(id)
                .<ResponseEntity<Void>>map(appt -> {
                    if (!Objects.equals(appt.getUser().getId(), me.getId())) {
                        return ResponseEntity.<Void>status(HttpStatus.FORBIDDEN).build();
                    }
                    appt.setStatus(AppointmentStatus.CANCELLED);
                    appointmentRepository.save(appt);
                    return ResponseEntity.<Void>noContent().build();
                })
                .orElseGet(() -> ResponseEntity.<Void>notFound().build());
    }

    // ADMIN: státusz módosítás (PENDING → CONFIRMED/CANCELLED)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          @RequestParam AppointmentStatus status) {
        if (status != AppointmentStatus.CONFIRMED && status != AppointmentStatus.CANCELLED) {
            return ResponseEntity.badRequest().body("Status must be CONFIRMED or CANCELLED");
        }

        return appointmentRepository.findById(id)
                .<ResponseEntity<?>>map(appt -> {
                    appt.setStatus(status);
                    return ResponseEntity.ok(appointmentRepository.save(appt));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
