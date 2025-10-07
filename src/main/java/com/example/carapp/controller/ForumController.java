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
import java.util.List;
import java.util.Optional;

/**
 * Fórum/üzenőfal CRUD + kommentek.
 */
@RestController
@RequestMapping("/api/forum")
public class ForumController {

    private final PostRepository postRepo;
    private final CommentRepository commentRepo;
    private final UserRepository userRepo;

    public ForumController(PostRepository postRepo,
                           CommentRepository commentRepo,
                           UserRepository userRepo) {
        this.postRepo = postRepo;
        this.commentRepo = commentRepo;
        this.userRepo = userRepo;
    }

    // ---------- POSTS ----------

    /** Legújabbtól a régebbiig – opcionális kategória szűrővel. */
    @GetMapping("/posts")
    public List<PostResponse> listPosts(@RequestParam(required = false) ForumCategory category) {
        List<Post> list = (category == null)
                ? postRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                : postRepo.findByCategoryOrderByCreatedAtDesc(category);

        return list.stream().map(this::toPostResponse).toList();
    }

    /** Egy poszt. */
    @GetMapping("/posts/{id}")
    public ResponseEntity<PostResponse> getPost(@PathVariable Long id) {
        return postRepo.findById(id)
                .map(p -> ResponseEntity.ok(toPostResponse(p)))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /** Új poszt (auth szükséges). */
    @PostMapping("/posts")
    public ResponseEntity<PostResponse> createPost(@Valid @RequestBody PostRequest req,
                                                   Authentication auth) {
        if (auth == null || !auth.isAuthenticated())
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        var user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        Post p = new Post();
        p.setAuthor(user);
        p.setTitle(blankToNull(req.getTitle())); // lehet null -> frontend defaultol
        p.setContent(req.getContent());
        p.setCategory(req.getCategory() != null ? req.getCategory() : ForumCategory.GENERAL);
        p.setRating(normalizeRating(req.getRating()));

        Post saved = postRepo.save(p);
        return ResponseEntity.status(HttpStatus.CREATED).body(toPostResponse(saved));
    }

    /** Módosítás (tulajdonos vagy ADMIN). */
    @PutMapping("/posts/{id}")
    public ResponseEntity<PostResponse> updatePost(@PathVariable Long id,
                                                   @Valid @RequestBody PostRequest req,
                                                   Authentication auth) {
        if (auth == null || !auth.isAuthenticated())
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        Optional<Post> opt = postRepo.findById(id);
        if (opt.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        Post p = opt.get();
        boolean isOwner = p.getAuthor().getId().equals(me.getId());
        boolean isAdmin = me.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        p.setTitle(blankToNull(req.getTitle()));
        p.setContent(req.getContent());
        p.setCategory(req.getCategory() != null ? req.getCategory() : ForumCategory.GENERAL);
        p.setRating(normalizeRating(req.getRating()));
        p.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(toPostResponse(postRepo.save(p)));
    }

    /** POSZT törlés (tulajdonos vagy ADMIN). */
    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated())
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        Optional<Post> opt = postRepo.findById(id);
        if (opt.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        Post p = opt.get();
        boolean isOwner = p.getAuthor().getId().equals(me.getId());
        boolean isAdmin = me.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        postRepo.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    // ---------- COMMENTS ----------

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> listComments(@PathVariable Long postId) {
        if (!postRepo.existsById(postId))
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        var list = commentRepo.findByPost_IdOrderByCreatedAtDesc(postId)
                .stream().map(this::toCommentResponse).toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long postId,
                                                      @Valid @RequestBody CommentRequest req,
                                                      Authentication auth) {
        if (auth == null || !auth.isAuthenticated())
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        var opt = postRepo.findById(postId);
        if (opt.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        Comment c = new Comment();
        c.setPost(opt.get());
        c.setAuthor(me);
        c.setContent(req.getContent());
        c.setCreatedAt(LocalDateTime.now());

        Comment saved = commentRepo.save(c);
        return ResponseEntity.status(HttpStatus.CREATED).body(toCommentResponse(saved));
    }

    /** KOMMENT törlés (komment szerzője vagy ADMIN). */
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
        }
        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        var opt = commentRepo.findById(id);
        if (opt.isEmpty()) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

        var c = opt.get();
        boolean isOwner = c.getAuthor().getId().equals(me.getId());
        boolean isAdmin  = me.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) return new ResponseEntity<>(HttpStatus.FORBIDDEN);

        commentRepo.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    // ---------- Mapperek & segédek ----------

    private PostResponse toPostResponse(Post p) {
        PostResponse r = new PostResponse();
        r.setId(p.getId());
        r.setAuthorId(p.getAuthor().getId());
        r.setAuthorName(p.getAuthor().getName());
        r.setTitle(p.getTitle());
        r.setContent(p.getContent());
        r.setCategory(p.getCategory());
        r.setRating(p.getRating());
        r.setCreatedAt(p.getCreatedAt());
        r.setUpdatedAt(p.getUpdatedAt());
        return r;
    }

    private CommentResponse toCommentResponse(Comment c) {
        CommentResponse r = new CommentResponse();
        r.setId(c.getId());
        r.setAuthorId(c.getAuthor().getId());
        r.setAuthorName(c.getAuthor().getName());
        r.setContent(c.getContent());
        r.setCreatedAt(c.getCreatedAt());
        return r;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static Integer normalizeRating(Integer r) {
        if (r == null) return null;
        return Math.max(1, Math.min(5, r));
    }
}
