package com.example.carapp.controller;

import com.example.carapp.dto.ServiceCenterRequest;
import com.example.carapp.dto.ServiceCenterResponse;
import com.example.carapp.dto.ServiceVoteRequest;
import com.example.carapp.model.ServiceCenter;
import com.example.carapp.repository.ServiceCenterRepository;
import com.example.carapp.repository.ServiceVoteRepository;
import com.example.carapp.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    // LÉTREHOZÁS – ADMIN (SecurityConfig-ben védd hasAuthority("ADMIN")-nal)
    @PostMapping
    public ResponseEntity<ServiceCenterResponse> create(@Valid @RequestBody ServiceCenterRequest req) {
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
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        var center = centerRepo.findById(id).orElse(null);
        if (center == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Center not found");

        var now = LocalDate.now();
        int y = now.getYear();
        int m = now.getMonthValue();

        var existing = voteRepo.findByUser_IdAndCenter_IdAndVoteYearAndVoteMonth(user.getId(), id, y, m);
        if (existing.isPresent()) {
            var v = existing.get();
            v.setRating(req.getRating());
            voteRepo.save(v);
            return ResponseEntity.ok("Updated your vote for this month");
        }

        var v = new com.example.carapp.model.ServiceVote();
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

        List<Map<String, Object>> result = rows.stream().map((Object[] r) -> {
            Map<String, Object> obj = new LinkedHashMap<>();
            obj.put("centerId",  r[0]);
            obj.put("name",      r[1]);
            obj.put("city",      r[2]);
            obj.put("address",   r[3]);
            obj.put("avgRating", r[4]);
            obj.put("votes",     r[5]);
            return obj; // <- már Map-ként tér vissza
        }).toList();

        return ResponseEntity.ok(result);
    }
}
