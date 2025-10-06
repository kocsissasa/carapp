package com.example.carapp.controller;

import com.example.carapp.dto.ServiceCenterRequest;
import com.example.carapp.dto.ServiceCenterResponse;
import com.example.carapp.dto.ServiceVoteRequest;
import com.example.carapp.model.*;
import com.example.carapp.repository.*;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/centers")
public class ServiceCenterController {

    private final ServiceCenterRepository centerRepo;
    private final ServiceVoteRepository voteRepo;
    private final UserRepository userRepo;

    public ServiceCenterController(ServiceCenterRepository centerRepo,
                                   ServiceVoteRepository voteRepo,
                                   UserRepository userRepo) {
        this.centerRepo = centerRepo;
        this.voteRepo = voteRepo;
        this.userRepo = userRepo;
    }

    // LISTA – publikus
    @GetMapping
    public List<ServiceCenter> list(@RequestParam(required = false) String city) {
        if (city != null && !city.isBlank()) return centerRepo.findByCityIgnoreCase(city);
        return centerRepo.findAll();
    }

    // LÉTREHOZÁS – ADMIN
    @PostMapping
    public ResponseEntity<ServiceCenterResponse> create(@Valid @RequestBody ServiceCenterRequest req,
                                                        Authentication auth) {
        // itt feltételezzük, hogy SecurityConfig hasAuthority("ADMIN") szabályozza a hozzáférést
        var sc = new ServiceCenter(req.getName(), req.getCity(), req.getAddress());
        sc.setPlaceId(req.getPlaceId());
        var saved = centerRepo.save(sc);

        var resp = new ServiceCenterResponse();
        resp.setId(saved.getId());
        resp.setName(saved.getName());
        resp.setCity(saved.getCity());
        resp.setAddress(saved.getAddress());
        resp.setPlaceId(saved.getPlaceId());
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    // SZAVAZÁS – AUTH (1–5) | havi egy szavazat / center / user
    @PostMapping("/{id}/vote")
    public ResponseEntity<?> vote(@PathVariable Long id,
                                  @Valid @RequestBody ServiceVoteRequest req,
                                  Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        var user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        var center = centerRepo.findById(id).orElse(null);
        if (center == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Center not found");

        var now = LocalDate.now();
        int y = now.getYear();
        int m = now.getMonthValue();

        var existing = voteRepo.findByUser_IdAndCenter_IdAndVoteYearAndVoteMonth(user.getId(), id, y, m);
        if (existing.isPresent()) {
            // frissíthetjük is: pl. módosítja az adott havi értékelését
            var v = existing.get();
            v.setRating(req.getRating());
            voteRepo.save(v);
            return ResponseEntity.ok("Updated your vote for this month");
        }

        var v = new ServiceVote();
        v.setUser(user);
        v.setCenter(center);
        v.setRating(req.getRating());
        v.setVoteYear(y);
        v.setVoteMonth(m);
        voteRepo.save(v);

        return ResponseEntity.status(HttpStatus.CREATED).body("Vote saved");
    }

    // TOP HAVI SZERVIZEK – publikus (átlag + darab)
    @GetMapping("/top")
    public ResponseEntity<?> monthlyTop(@RequestParam(required = false) Integer year,
                                        @RequestParam(required = false) Integer month) {
        var now = LocalDate.now();
        int y = (year == null ? now.getYear() : year);
        int m = (month == null ? now.getMonthValue() : month);
        var rows = voteRepo.findMonthlyTopCenters(y, m);

        // egyszerű lista-objektumok (map-szerű)
        var result = rows.stream().map(r -> {
            var obj = new java.util.LinkedHashMap<String, Object>();
            obj.put("centerId", r[0]);
            obj.put("name", r[1]);
            obj.put("city", r[2]);
            obj.put("address", r[3]);
            obj.put("avgRating", r[4]);
            obj.put("votes", r[5]);
            return obj;
        }).toList();

        return ResponseEntity.ok(result);
    }
}
