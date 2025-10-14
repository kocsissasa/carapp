package com.example.carapp.controller;

import com.example.carapp.model.*;
import com.example.carapp.repository.CarRepository;
import com.example.carapp.repository.ServiceAppointmentRepository;
import com.example.carapp.repository.ServiceCenterRepository;
import com.example.carapp.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/appointments") // -> Prefix: minden endpoint /api/appointments alatt
public class ServiceAppointmentController {

    private final ServiceAppointmentRepository appointmentRepository; // -> Időpont tábla elérés
    private final CarRepository carRepository; // -> Autó tábla elérés
    private final UserRepository userRepository; // -> User tábla elérés
    private final ServiceCenterRepository centerRepository; // -> Szervizközpont tábla elérés

    public ServiceAppointmentController(ServiceAppointmentRepository appointmentRepository,
                                        CarRepository carRepository,
                                        UserRepository userRepository,
                                        ServiceCenterRepository centerRepository) {
        this.appointmentRepository = appointmentRepository; // mezők beállítása
        this.carRepository = carRepository;
        this.userRepository = userRepository;
        this.centerRepository = centerRepository;
    }

    // ADMIN: összes időpont
    @GetMapping
    public List<ServiceAppointment> getAll() {
        return appointmentRepository.findAll(); // -> Minden időpont visszaadása
    }

    // USER: saját időpontok listázása
    @GetMapping("/me")
    public ResponseEntity<List<ServiceAppointment>> myAppointments(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) { // -> Ha nincs bejelentkezve 401
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return userRepository.findByEmail(auth.getName()) // -> Email alapján keresés
                .map(me -> ResponseEntity.ok(appointmentRepository.findByUser(me))) // -> Saját időpontok
                .orElseGet(() -> ResponseEntity.status(HttpStatus.FORBIDDEN).build()); // -> 403, ha nincs rekord
    }

    // USER: új időpont (saját autó + KÖTELEZŐ center)
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody ServiceAppointment req, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) { // Auth ellenőrzés
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); // 401
        }

        //  A bejelentkezett felhasználó lekérése
        return userRepository.findByEmail(auth.getName())
                .<ResponseEntity<?>>map(user -> {

                    // --- Autó ---
                    if (req.getCar() == null || req.getCar().getId() == null) { // Kötelező car ID
                        return ResponseEntity.badRequest().body("Car id is required"); // 400
                    }
                    var carOpt = carRepository.findById(req.getCar().getId()); // Car betöltése ID alapján
                    if (carOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Car not found"); // 404
                    var car = carOpt.get();
                    if (!Objects.equals(car.getOwner().getId(), user.getId())) { // csak saját autóra foglalhat
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not your car"); // 403
                    }

                    // --- Center (kötelező) ---
                    if (req.getCenter() == null || req.getCenter().getId() == null) { // kötelező servicecenter ID
                        return ResponseEntity.badRequest().body("Service center id is required"); // 400
                    }
                    var centerOpt = centerRepository.findById(req.getCenter().getId()); // servicecenter betöltése
                    if (centerOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Service center not found");
                    var center = centerOpt.get();

                    // --- Ütközés ellenőrzés (ugyanarra a kocsira, ugyanabban az időpontban már van foglalás?) ---
                    if (appointmentRepository.existsByCar_IdAndServiceDateTime(car.getId(), req.getServiceDateTime())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).body("Time slot already booked for this car");
                    }

                    // --- Mentés ---
                    var appt = new ServiceAppointment(); // -> Új időpont entitás
                    appt.setCar(car); // -> Autó hozzárendelése
                    appt.setUser(user); // -> Foglaló user hozzárendelése
                    appt.setCenter(center); // -> Választott szervizközpont
                    appt.setServiceDateTime(req.getServiceDateTime()); // -> Időpont
                    appt.setDescription(req.getDescription()); // -> Leírás (opcionális)
                    appt.setStatus(AppointmentStatus.PENDING); // -> Kezdeti státusz: PENDING
                    appt.setCreatedAt(LocalDateTime.now()); // -> Létrehozás ideje

                    return ResponseEntity.ok(appointmentRepository.save(appt)); // -> Mentés + 200 OK vissza
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.FORBIDDEN).body("User not found")); // -> 403, ha nincs user
    }

    // USER: módosítás (leírás/dátum/center) amíg PENDING
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody ServiceAppointment updated, // -> A módosítani kívánt mezők a body-ban
                                    Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) { // -> Auth ellenőrzés
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); // -> 401
        }
        var me = userRepository.findByEmail(auth.getName()).orElse(null); // -> Bejelentkezett user betöltése
        if (me == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // -> 403

        return appointmentRepository.findById(id) // -> Időpont keresése ID alapján
                .<ResponseEntity<?>>map(appt -> {
                    if (!Objects.equals(appt.getUser().getId(), me.getId())) { // -> Csak a saját időpont módosítható
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not your appointment"); // -> 403
                    }
                    if (appt.getStatus() != AppointmentStatus.PENDING) { // -> Csak PENDING állapotban szerkeszthető
                        return ResponseEntity.status(HttpStatus.CONFLICT).body("Only PENDING appointments can be edited"); // -> 409
                    }

                    // -> Ütközés ellenőrzés új dátum esetén (ugyanarra az autóra)
                    if (updated.getServiceDateTime() != null &&
                            appointmentRepository.existsByCar_IdAndServiceDateTime(
                                    appt.getCar().getId(), updated.getServiceDateTime())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).body("Time slot already booked for this car"); // -> 409
                    }

                    if (updated.getDescription() != null && !updated.getDescription().isBlank()) {
                        appt.setDescription(updated.getDescription()); // -> Leírás frissítése
                    }
                    if (updated.getServiceDateTime() != null) {
                        appt.setServiceDateTime(updated.getServiceDateTime()); // -> Időpont frissítése
                    }
                    if (updated.getCenter() != null && updated.getCenter().getId() != null) { // -> Center csere (ha ID-t kaptunk)
                        var cOpt = centerRepository.findById(updated.getCenter().getId()); // -> Új center ellenőrzése
                        if (cOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Service center not found"); // -> 404
                        appt.setCenter(cOpt.get()); // -> Új center beállítása
                    }

                    return ResponseEntity.ok(appointmentRepository.save(appt)); // -> Mentés és vissza
                })
                .orElseGet(() -> ResponseEntity.notFound().build()); // -> 404, ha nincs ilyen ID
    }

    // USER: lemondás (CANCELLED)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) { // -> Auth ellenőrzés
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); // -> 401
        }
        var me = userRepository.findByEmail(auth.getName()).orElse(null); // -> User betöltése
        if (me == null) return ResponseEntity.<Void>status(HttpStatus.FORBIDDEN).build(); // -> 403

        return appointmentRepository.findById(id) // -> Időpont megkeresése
                .<ResponseEntity<Void>>map(appt -> {
                    if (!Objects.equals(appt.getUser().getId(), me.getId())) { // -> Csak saját időpont mondható le
                        return ResponseEntity.<Void>status(HttpStatus.FORBIDDEN).build(); // -> 403
                    }
                    appt.setStatus(AppointmentStatus.CANCELLED); // -> Státusz CANCELLED-re
                    appointmentRepository.save(appt); // -> Mentés
                    return ResponseEntity.<Void>noContent().build(); // -> 204 No Content (siker)
                })
                .orElseGet(() -> ResponseEntity.<Void>notFound().build()); // -> 404, ha nincs ilyen időpont
    }

    // ADMIN: státusz módosítás
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          @RequestParam AppointmentStatus status) {
        if (status != AppointmentStatus.CONFIRMED && status != AppointmentStatus.CANCELLED) { // -> Csak ez a két státusz engedett itt
            return ResponseEntity.badRequest().body("Status must be CONFIRMED or CANCELLED"); // -> 400
        }
        return appointmentRepository.findById(id) // -> Időpont betöltése
                .<ResponseEntity<?>>map(appt -> {
                    appt.setStatus(status); // -> Státusz frissítése
                    return ResponseEntity.ok(appointmentRepository.save(appt)); // -> Mentés és 200 OK
                })
                .orElseGet(() -> ResponseEntity.notFound().build()); // -> 404, ha nincs ilyen időpont
    }
}
