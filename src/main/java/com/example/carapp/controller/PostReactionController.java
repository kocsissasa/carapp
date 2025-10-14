// com/example/carapp/controller/PostReactionController.java
package com.example.carapp.controller;

import com.example.carapp.dto.ReactionSummary;
import com.example.carapp.model.*;
import com.example.carapp.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;


/* Feladata:
*  - kezelni a fórumposztok reakcióit (LIKE, DISLIKE, stb.)
*  - kiszolgálni a frontend igényeit: lekérdezés, hozzáadás, törlés
*  - minden művelet user-specifikus és auth-hoz kötött
*/


@RestController
@RequestMapping("/api/forum") // -> Az összes végpont /api/forum/... alatt érhető el
public class PostReactionController {

    private final PostRepository postRepo; // ➜ A fórumposztokat kezeli
    private final UserRepository userRepo; // ➜ A felhasználókhoz fér hozzá (auth alapján)
    private final PostReactionRepository reactionRepo; // ➜ A poszt-reakciókat kezeli

    public PostReactionController(PostRepository postRepo, UserRepository userRepo,
                                  PostReactionRepository reactionRepo) {
        this.postRepo = postRepo;
        this.userRepo = userRepo;
        this.reactionRepo = reactionRepo;
    }

    // GET /api/forum/posts/{id}/reactions – összegzés + a bejelentkezett user reakciója
    @GetMapping("/posts/{id}/reactions")
    public ResponseEntity<ReactionSummary> getSummary(@PathVariable Long id, Authentication auth) {
        var post = postRepo.findById(id).orElse(null); // -> Lekérjük az adott posztot ID alapján
        if (post == null) return ResponseEntity.notFound().build(); // -> Ha nincs ilyen poszt, 404-et adunk

        Map<ReactionType, Long> counts = new EnumMap<>(ReactionType.class);
        //  Aggregált adatlekérés: minden típushoz reakció számlálás
        reactionRepo.aggregateByType(id).forEach(row -> {
            ReactionType t = (ReactionType) row[0]; // -> ENUM típus
            Long c = (Long) row[1]; // db szám
            counts.put(t, c); // map-hez hozzáadjuk
        });

        // -> Az aktuális user saját reakciója (ha be van jelentkezve)
        ReactionType mine = null;
        if (auth != null && auth.isAuthenticated()) { // -> Csak ha belépett user
            var me = userRepo.findByEmail(auth.getName()).orElse(null); // email alapján azonosítás
            if (me != null) {
                mine = reactionRepo.findByPost_IdAndUser_Id(id, me.getId()) // reagált-e már a user?
                        .map(PostReaction::getType).orElse(null); // ha igen..levesszük a ReactionType-ot
            }
        }

        // -> DTO építése a frontend számára
        var dto = new ReactionSummary();
        dto.setPostId(id); // -> Melyik posztról van szó
        dto.setCounts(counts); // -> Összesített reakciók
        dto.setMyReaction(mine); // -> A user aktuális reakciója
        return ResponseEntity.ok(dto); // -> 200 OK + ReactionSummary JSON
    }

    // PUT /api/forum/posts/{id}/react?type=LIKE – beállít/átír egy reakciót a usernek
    @PutMapping("/posts/{id}/react")
    public ResponseEntity<ReactionSummary> react(@PathVariable Long id,
                                                 @RequestParam ReactionType type,
                                                 Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return ResponseEntity.status(401).build(); // csak belépett user reagálhat -> 401 AUTH

        var post = postRepo.findById(id).orElse(null); // létezik-e a poszt
        if (post == null) return ResponseEntity.notFound().build(); // 404 ha nem

        var me = userRepo.findByEmail(auth.getName()).orElse(null); // user beazonosítása
        if (me == null) return ResponseEntity.status(403).build(); // ha nincs -> 403 Forbidden

        var existing = reactionRepo.findByPost_IdAndUser_Id(id, me.getId()).orElse(null); // megnézzük van-e korábbi reakció
        if (existing == null) { // ha nincs, akkor újat
            var r = new PostReaction();
            r.setPost(post); // poszthoz kapcsolás
            r.setUser(me); // ki reagált
            r.setType(type); // reakció típusa
            reactionRepo.save(r); // mentés database-be

        } else { // ha már van, akkor csak frissitjük
            existing.setType(type);
            reactionRepo.save(existing);
        }

        return getSummary(id, auth);
    }

    // DELETE /api/forum/posts/{id}/react – törli a user reakcióját a posztról
    @DeleteMapping("/posts/{id}/react")
    public ResponseEntity<ReactionSummary> removeReact(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return ResponseEntity.status(401).build(); // -> Csak belépett user törölheti a saját reakcióját

        var post = postRepo.findById(id).orElse(null); // Létezik-e a poszt
        if (post == null) return ResponseEntity.notFound().build();

        var me = userRepo.findByEmail(auth.getName()).orElse(null); // USER lekérése
        if (me == null) return ResponseEntity.status(403).build();

        // ha létezik -> töröljük
        reactionRepo.findByPost_IdAndUser_Id(id, me.getId())
                .ifPresent(reactionRepo::delete);

        // -> Friss összegzés visszaadása
        return getSummary(id, auth);
    }
}
