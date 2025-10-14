package com.example.carapp.controller;

import com.example.carapp.dto.CommentRequest;
import com.example.carapp.dto.CommentResponse;
import com.example.carapp.dto.PostRequest;
import com.example.carapp.dto.PostResponse;
import com.example.carapp.model.*;
import com.example.carapp.repository.CommentRepository;
import com.example.carapp.repository.PostRepository;
import com.example.carapp.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Fórum/üzenőfal CRUD + kommentek.
 * A REAKCIÓK külön controllerben maradnak (PostReactionController)
 */
@RestController
@RequestMapping("/api/forum")
public class ForumController {

    // Repository-k az adatbázis műveletekhez
    private final PostRepository postRepo;   // -> posztok
    private final CommentRepository commentRepo;  // -> kommentek
    private final UserRepository userRepo;  // -> felhasználók

    public ForumController(PostRepository postRepo,
                           CommentRepository commentRepo,
                           UserRepository userRepo) {
        this.postRepo = postRepo;
        this.commentRepo = commentRepo;
        this.userRepo = userRepo;
    }

    // ---------- POSTS ----------

    // Legújabbtól a régebbiig lekérés
    @GetMapping("/posts")
    public List<PostResponse> listPosts() {
        return postRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt")) // rendezve visszaadja a posztokat
                .stream().map(this::toPostResponse).toList(); // -> entity to DTO
    }

    // poszt lekérése ID alapján
    @GetMapping("/posts/{id}")
    public ResponseEntity<PostResponse> getPost(@PathVariable Long id) {
        return postRepo.findById(id)
                .map(p -> ResponseEntity.ok(toPostResponse(p))) // ha van ilyen poszt visszaadjuk
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND)); // 404 NOT FOUND, ha nincs
    }

    // Új poszt létrehozása
    @PostMapping("/posts")
    public ResponseEntity<PostResponse> createPost(@Valid @RequestBody PostRequest req,
                                                   Authentication auth) { // bejelentkezett felhasználó adatai
        if (auth == null || !auth.isAuthenticated()) // -> ha nincs belépve a user
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED); // 401 Unauthorized

        var user = userRepo.findByEmail(auth.getName()).orElse(null); // email alapján USER keresés
        if (user == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN); // 403 forbidden, ha nincs

        // Új poszt létrehozása és adatok megadása
        Post p = new Post();
        p.setAuthor(user); // tulajdonos beállítása
        p.setTitle((req.getTitle() == null || req.getTitle().isBlank()) ? null : req.getTitle().trim()); // ha üres a cím, akkor null
        p.setContent(req.getContent()); // tartalom beállítása
        p.setCategory(req.getCategory() != null ? req.getCategory() : ForumCategory.GENERAL); // ha nincs Category, akkor "GENERAL"
        p.setRating(req.getRating() != null ? Math.max(1, Math.min(5, req.getRating())) : null); // rating 1-5 közé korlátozás

        // mentés és visszaadás
        Post saved = postRepo.save(p);
        return ResponseEntity.status(HttpStatus.CREATED).body(toPostResponse(saved));
    }

    // Posztot módosítani csak a tulajdonos vagy ADMIN tud
    @PutMapping("/posts/{id}")
    public ResponseEntity<PostResponse> updatePost(@PathVariable Long id,
                                                   @Valid @RequestBody PostRequest req,
                                                   Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) // auth checkin
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        var me = userRepo.findByEmail(auth.getName()).orElse(null); // saját user betöltése
        if (me == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        var opt = postRepo.findById(id); // létezik-e a poszt
        if (opt.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        var p = opt.get();
        boolean isOwner = p.getAuthor().getId().equals(me.getId()); // saját posz-e?
        boolean isAdmin = me.getRole() == Role.ADMIN; // admin-e?
        if (!isOwner && !isAdmin) return new ResponseEntity<>(HttpStatus.FORBIDDEN);  // tiltás, ha none of them

        // Updated mezők beállítása
        p.setTitle((req.getTitle() == null || req.getTitle().isBlank()) ? null : req.getTitle().trim()); // cím frissitése
        p.setContent(req.getContent());  // tartalom frissitése
        p.setCategory(req.getCategory() != null ? req.getCategory() : ForumCategory.GENERAL); // Kategória default értékkel
        p.setRating(req.getRating() != null ? Math.max(1, Math.min(5, req.getRating())) : null); // értékelés
        p.setUpdatedAt(LocalDateTime.now()); // módosítás dátuma

        return ResponseEntity.ok(toPostResponse(postRepo.save(p))); // mentés és 200 OK
    }

    /** POSZT törlés – poszt tulajdonosa vagy ADMIN. */
    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) // -> ha nincs belépve
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        var me = userRepo.findByEmail(auth.getName()).orElse(null); // saját user betöltése
        if (me == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        var opt = postRepo.findById(id); // poszt létezik-e
        if (opt.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        var p = opt.get();
        boolean isOwner = p.getAuthor().getId().equals(me.getId()); // szerző?
        boolean isAdmin = me.getRole() == Role.ADMIN; // ADMIN?
        if (!isOwner && !isAdmin) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        postRepo.deleteById(id); // törlés
        return new ResponseEntity<>(HttpStatus.NO_CONTENT); // 204 no content, tehát jó
    }

    // ---------- COMMENTS ----------
    // poszthoz tartozó kommentek lekérése
    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> listComments(@PathVariable Long postId) {
        if (!postRepo.existsById(postId)) // 404, ha nincs ilyen poszt
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        var list = commentRepo.findByPost_IdOrderByCreatedAtDesc(postId) // kommentek lekérése
                .stream().map(this::toCommentResponse).toList(); // -> DTO-vá alakítás
        return ResponseEntity.ok(list); // -> 200 OK + kommentek listája
    }

    // Új komment hozzáadása csak belépett felhasználóként
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long postId,
                                                      @Valid @RequestBody CommentRequest req,
                                                      Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) // AUTH ellenőrzés
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        var me = userRepo.findByEmail(auth.getName()).orElse(null); // saját user betöltése
        if (me == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        var opt = postRepo.findById(postId); // -> Megnézzük, hogy a poszt létezik-e
        if (opt.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        // Új komment létrehozása
        Comment c = new Comment(); // ÚJ objektum
        c.setPost(opt.get()); // hozzárendeljük a poszthoz
        c.setAuthor(me); // szerző beállítása
        c.setContent(req.getContent()); // szöveg
        c.setCreatedAt(LocalDateTime.now()); // dátum

        Comment saved = commentRepo.save(c); // mentés
        return ResponseEntity.status(HttpStatus.CREATED).body(toCommentResponse(saved)); // 201 OK
    }

    // KOMMENT törlés – komment tulajdonos VAGY ADMIN.
    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteCommentNested(@PathVariable Long postId,
                                                    @PathVariable Long commentId,
                                                    Authentication auth) {
        return deleteCommentInternal(postId, commentId, auth);
    }

    // Ugyanaz a törlés egyszerű útvonalon is – ha ezt hívja a frontend.
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteCommentFlat(@PathVariable Long commentId, Authentication auth) {
        // postId itt nem ismert – a belső metódus engedi nullal (postId check nélkül).
        return deleteCommentInternal(null, commentId, auth);
    }

    //  Közös belső metódus a két törlési endpoint számára kódduplikáció elkerülésére
    private ResponseEntity<Void> deleteCommentInternal(Long postId, Long commentId, Authentication auth) {
        if (auth == null || !auth.isAuthenticated())
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        var opt = commentRepo.findById(commentId);
        if (opt.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        var c = opt.get();
        //  Ha megadtuk postId-t, ellenőrizzük, hogy tényleg ahhoz a poszthoz tartozik-e
        if (postId != null && !Objects.equals(c.getPost().getId(), postId))
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);

        boolean isOwner = c.getAuthor().getId().equals(me.getId()); // saját?
        boolean isAdmin = me.getRole() == Role.ADMIN; // ADMIN?
        if (!isOwner && !isAdmin) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        commentRepo.deleteById(commentId); // komment törlése adatbázisból
        return new ResponseEntity<>(HttpStatus.NO_CONTENT); // -> 204 No Content válasz
    }

    // ---------- Mapperek ----------
    // csak a biztonságos és szükséges adatokat küldjük vissza a frontendnek

    private PostResponse toPostResponse(Post p) {
        PostResponse r = new PostResponse(); // -> Új DTO objektum
        r.setId(p.getId()); // -> Poszt ID
        r.setAuthorId(p.getAuthor().getId()); // -> ID
        r.setAuthorName(p.getAuthor().getName()); // -> Szerző neve
        r.setTitle(p.getTitle()); // -> Cím
        r.setContent(p.getContent()); // -> Content
        r.setCategory(p.getCategory()); // -> Kategória
        r.setRating(p.getRating()); // -> Értékelés
        r.setCreatedAt(p.getCreatedAt()); // -> Létrehozás ideje
        r.setUpdatedAt(p.getUpdatedAt()); // -> Utolsó módosítás ideje
        return r;
    }

    private CommentResponse toCommentResponse(Comment c) {
        CommentResponse r = new CommentResponse(); // -> Új DTO objektum
        r.setId(c.getId()); // -> Komment ID
        r.setAuthorId(c.getAuthor().getId()); // -> ID
        r.setAuthorName(c.getAuthor().getName()); // -> Szerző neve
        r.setContent(c.getContent()); // -> Content
        r.setCreatedAt(c.getCreatedAt()); // -> Létrehozás ideje
        return r;
    }
}
