// com/example/carapp/controller/PostReactionController.java
package com.example.carapp.controller;

import com.example.carapp.dto.ReactionSummary;
import com.example.carapp.model.*;
import com.example.carapp.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/forum")
public class PostReactionController {

    private final PostRepository postRepo;
    private final UserRepository userRepo;
    private final PostReactionRepository reactionRepo;

    public PostReactionController(PostRepository postRepo, UserRepository userRepo,
                                  PostReactionRepository reactionRepo) {
        this.postRepo = postRepo;
        this.userRepo = userRepo;
        this.reactionRepo = reactionRepo;
    }

    /** GET /api/forum/posts/{id}/reactions – összegzés + a bejelentkezett user reakciója */
    @GetMapping("/posts/{id}/reactions")
    public ResponseEntity<ReactionSummary> getSummary(@PathVariable Long id, Authentication auth) {
        var post = postRepo.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();

        Map<ReactionType, Long> counts = new EnumMap<>(ReactionType.class);
        reactionRepo.aggregateByType(id).forEach(row -> {
            ReactionType t = (ReactionType) row[0];
            Long c = (Long) row[1];
            counts.put(t, c);
        });

        ReactionType mine = null;
        if (auth != null && auth.isAuthenticated()) {
            var me = userRepo.findByEmail(auth.getName()).orElse(null);
            if (me != null) {
                mine = reactionRepo.findByPost_IdAndUser_Id(id, me.getId())
                        .map(PostReaction::getType).orElse(null);
            }
        }

        var dto = new ReactionSummary();
        dto.setPostId(id);
        dto.setCounts(counts);
        dto.setMyReaction(mine);
        return ResponseEntity.ok(dto);
    }

    /** PUT /api/forum/posts/{id}/react?type=LIKE – beállít/átír egy reakciót a usernek */
    @PutMapping("/posts/{id}/react")
    public ResponseEntity<ReactionSummary> react(@PathVariable Long id,
                                                 @RequestParam ReactionType type,
                                                 Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return ResponseEntity.status(401).build();

        var post = postRepo.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();

        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) return ResponseEntity.status(403).build();

        var existing = reactionRepo.findByPost_IdAndUser_Id(id, me.getId()).orElse(null);
        if (existing == null) {
            var r = new PostReaction();
            r.setPost(post);
            r.setUser(me);
            r.setType(type);
            reactionRepo.save(r);
        } else {
            existing.setType(type);
            reactionRepo.save(existing);
        }

        return getSummary(id, auth);
    }

    /** DELETE /api/forum/posts/{id}/react – törli a user reakcióját a posztról */
    @DeleteMapping("/posts/{id}/react")
    public ResponseEntity<ReactionSummary> removeReact(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return ResponseEntity.status(401).build();

        var post = postRepo.findById(id).orElse(null);
        if (post == null) return ResponseEntity.notFound().build();

        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) return ResponseEntity.status(403).build();

        reactionRepo.findByPost_IdAndUser_Id(id, me.getId())
                .ifPresent(reactionRepo::delete);

        return getSummary(id, auth);
    }
}
