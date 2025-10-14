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
@RequestMapping("/api/centers") // -> Minden endpoint /api/centers alatt
public class ServiceCenterController {

    private final ServiceCenterRepository centerRepo; // -> Szervizközpont CRUD
    private final ServiceVoteRepository voteRepo; // -> Szavazatok kezelése
    private final UserRepository userRepo; // -> User lookup (auth → user)

    public ServiceCenterController(ServiceCenterRepository centerRepo,
                                   ServiceVoteRepository voteRepo,
                                   UserRepository userRepo) {
        this.centerRepo = centerRepo;
        this.voteRepo = voteRepo;
        this.userRepo = userRepo;
    }

    // LISTA – publikus
    @GetMapping
    public List<ServiceCenter> list(@RequestParam(required = false) String city) { // -> Opcionális city szűrő
        if (city != null && !city.isBlank()) return centerRepo.findByCityIgnoreCase(city); // -> Város szerinti szűrés
        return centerRepo.findAll(); // -> Egyébként minden központ
    }

    // LÉTREHOZÁS – ADMIN (SecurityConfig-ben védd hasAuthority("ADMIN")-nal)
    @PostMapping
    public ResponseEntity<ServiceCenterResponse> create(@Valid @RequestBody ServiceCenterRequest req) { // -> Validált bejövő DTO
        var sc = new ServiceCenter(req.getName(), req.getCity(), req.getAddress()); // -> Új entitás DTO-ból
        sc.setPlaceId(req.getPlaceId()); // -> Opcionális Google Place ID
        var saved = centerRepo.save(sc); // -> Mentés DB-be

        // -> Kimenő DTO
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
                                  @Valid @RequestBody ServiceVoteRequest req, // -> rating mező validálva (1–5)
                                  Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) { // -> Auth ellenőrzés
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); // -> 401
        }
        var user = userRepo.findByEmail(auth.getName()).orElse(null); // -> Bejelentkezett user betöltése
        if (user == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).build(); // -> 403

        var center = centerRepo.findById(id).orElse(null); // -> Center létezik?
        if (center == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Center not found"); // -> 404

        var now = LocalDate.now(); // -> Mai dátum
        int y = now.getYear(); // -> Év
        int m = now.getMonthValue(); // -> Hónap

        // -> Megnézzük: szavazott-e már ez a user ebben a hónapban erre a centerre?
        var existing = voteRepo.findByUser_IdAndCenter_IdAndVoteYearAndVoteMonth(user.getId(), id, y, m);
        if (existing.isPresent()) {
            var v = existing.get(); // -> Van előző szavazat → frissítjük az értéket
            v.setRating(req.getRating());
            voteRepo.save(v); // -> Mentés
            return ResponseEntity.ok("Updated your vote for this month"); // -> 200 OK
        }

        // -> Nincs még havi szavazat → új rekord
        var v = new com.example.carapp.model.ServiceVote();
        v.setUser(user);  // Felhasználó
        v.setCenter(center); // Központ
        v.setRating(req.getRating()); // Értékelés
        v.setVoteYear(y); // Év
        v.setVoteMonth(m); // Hónap
        voteRepo.save(v);

        return ResponseEntity.status(HttpStatus.CREATED).body("Vote saved");
    }

    // TOP HAVI SZERVIZEK – publikus (átlag + darab)
    @GetMapping("/top")
    public ResponseEntity<?> monthlyTop(@RequestParam(required = false) Integer year,
                                        @RequestParam(required = false) Integer month) {
        var now = LocalDate.now(); // -> Ha nincs megadva year/month, akkor aktuális
        int y = (year == null ? now.getYear() : year); // -> Év default
        int m = (month == null ? now.getMonthValue() : month); // -> Hónap default

        var rows = voteRepo.findMonthlyTopCenters(y, m); // aggregáló lekérdezés

        // -> A lekérdezés eredményét (Object[] sorokat) beszabjuk szép JSON-ra
        List<Map<String, Object>> result = rows.stream().map((Object[] r) -> {
            Map<String, Object> obj = new LinkedHashMap<>(); // -> LinkedHashMap = sorrendet tartja
            obj.put("centerId",  r[0]); // -> Center ID
            obj.put("name",      r[1]); // -> Név
            obj.put("city",      r[2]); // -> Város
            obj.put("address",   r[3]); // -> Cím
            obj.put("avgRating", r[4]); // -> Havi átlagos értékelés
            obj.put("votes",     r[5]); // -> Szavazatok száma
            return obj; // <- már Map-ként tér vissza
        }).toList();

        return ResponseEntity.ok(result); // -> 200 OK + top lista
    }
}
