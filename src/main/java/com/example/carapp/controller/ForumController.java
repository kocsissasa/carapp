package com.example.carapp.controller;

import com.example.carapp.dto.CommentRequest;
import com.example.carapp.dto.CommentResponse;
import com.example.carapp.dto.PostRequest;
import com.example.carapp.dto.PostResponse;
import com.example.carapp.model.Comment;
import com.example.carapp.model.ForumCategory;
import com.example.carapp.model.Post;
import com.example.carapp.model.Role;
import com.example.carapp.repository.CommentRepository;
import com.example.carapp.repository.PostRepository;
import com.example.carapp.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;


/**
 * Ez kezeli a fórumhoz kapcsolódó végpontokat
 * CRUD műveletek
 * Kommentek
 * Jogosultságok (Olvasni bárki tudja, posztolni beléptetett felhasználó, ADMIN mindent tud)
 */
@RestController
@RequestMapping("/api/forum")
public class ForumController {

    private final PostRepository postRepo;
    private final CommentRepository commentRepo;
    private final UserRepository userRepo;

    public ForumController(PostRepository postRepo, CommentRepository commentRepo, UserRepository userRepo) {
        this.postRepo = postRepo;
        this.commentRepo = commentRepo;
        this.userRepo = userRepo;
    }

    // ---------- POSTS ----------

    // Listázás paginálva + szűrők: category, authorId, minRating
    @GetMapping("/posts")
    public Page<PostResponse> listPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @RequestParam(required = false) ForumCategory category,
            @RequestParam(required = false) Long authorId,
            @RequestParam(required = false) Integer minRating
    ) {
        String[] parts = sort.split(",", 2);
        String field = parts[0];
        boolean asc = parts.length > 1 && "asc".equalsIgnoreCase(parts[1]);
        Pageable pageable = PageRequest.of(page, size, asc ? Sort.by(field).ascending() : Sort.by(field).descending());

        Page<Post> res;
        if (category != null && minRating != null) {
            res = postRepo.findByCategoryAndRatingGreaterThanEqual(category, minRating, pageable);
        } else if (category != null) {
            res = postRepo.findByCategory(category, pageable);
        } else if (authorId != null) {
            res = postRepo.findByAuthor_Id(authorId, pageable);
        } else {
            res = postRepo.findAll(pageable);
        }

        return res.map(this::toPostResponse);
    }

// Konkrét poszt lekérése ID alapján
    @GetMapping("/posts/{id}")
    public ResponseEntity<PostResponse> getPost(@PathVariable Long id) {
        Optional<Post> opt = postRepo.findById(id);
        if (opt.isEmpty()) {
            return new ResponseEntity<PostResponse>(HttpStatus.NOT_FOUND);
        }
        return ResponseEntity.ok(toPostResponse(opt.get()));
    }
/**
 * --- Új poszt létrehozása ---
 *  Auth szükséges
 *  Mentés után CREATED (201) státuszt ad vissza
 */
    @PostMapping("/posts")
    public ResponseEntity<PostResponse> createPost(@Valid @RequestBody PostRequest req, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return new ResponseEntity<PostResponse>(HttpStatus.UNAUTHORIZED);
        }
        var user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null) {
            return new ResponseEntity<PostResponse>(HttpStatus.FORBIDDEN);
        }

        Post p = new Post();
        p.setAuthor(user);
        p.setTitle(req.getTitle());
        p.setContent(req.getContent());
        p.setCategory(req.getCategory());
        p.setRating(req.getRating());
        p.setCreatedAt(LocalDateTime.now());
        p.setUpdatedAt(LocalDateTime.now());

        Post saved = postRepo.save(p);
        return ResponseEntity.status(HttpStatus.CREATED).body(toPostResponse(saved));
    }
    /** --- Poszt módosítása ---
    *   Csak a tulajdonos vagy az ADMIN teheti meg
    */
    @PutMapping("/posts/{id}")
    public ResponseEntity<PostResponse> updatePost(@PathVariable Long id,
                                                   @Valid @RequestBody PostRequest req,
                                                   Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return new ResponseEntity<PostResponse>(HttpStatus.UNAUTHORIZED);
        }
        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) {
            return new ResponseEntity<PostResponse>(HttpStatus.FORBIDDEN);
        }

        Optional<Post> opt = postRepo.findById(id);
        if (opt.isEmpty()) {
            return new ResponseEntity<PostResponse>(HttpStatus.NOT_FOUND);
        }
        Post p = opt.get();

        boolean isOwner = p.getAuthor().getId().equals(me.getId());
        boolean isAdmin = me.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            return new ResponseEntity<PostResponse>(HttpStatus.FORBIDDEN);
        }

        p.setTitle(req.getTitle());
        p.setContent(req.getContent());
        p.setCategory(req.getCategory());
        p.setRating(req.getRating());
        p.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(toPostResponse(postRepo.save(p)));
    }

    /** --- Poszt törlése---
     *   Csak a tulajdonos vagy az ADMIN teheti meg
     */
    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return new ResponseEntity<Void>(HttpStatus.UNAUTHORIZED);
        }
        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) {
            return new ResponseEntity<Void>(HttpStatus.FORBIDDEN);
        }

        Optional<Post> opt = postRepo.findById(id);
        if (opt.isEmpty()) {
            return new ResponseEntity<Void>(HttpStatus.NOT_FOUND);
        }
        Post p = opt.get();

        boolean isOwner = p.getAuthor().getId().equals(me.getId());
        boolean isAdmin = me.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            return new ResponseEntity<Void>(HttpStatus.FORBIDDEN);
        }

        postRepo.deleteById(id);
        return new ResponseEntity<Void>(HttpStatus.NO_CONTENT);
    }

    // ---------- COMMENTS ----------

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> listComments(@PathVariable Long postId) {
        if (!postRepo.existsById(postId)) {
            return new ResponseEntity<List<CommentResponse>>(HttpStatus.NOT_FOUND);
        }
        var list = commentRepo.findByPost_IdOrderByCreatedAtDesc(postId)
                .stream().map(this::toCommentResponse).toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long postId,
                                                      @Valid @RequestBody CommentRequest req,
                                                      Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return new ResponseEntity<CommentResponse>(HttpStatus.UNAUTHORIZED);
        }
        var me = userRepo.findByEmail(auth.getName()).orElse(null);
        if (me == null) {
            return new ResponseEntity<CommentResponse>(HttpStatus.FORBIDDEN);
        }

        Optional<Post> opt = postRepo.findById(postId);
        if (opt.isEmpty()) {
            return new ResponseEntity<CommentResponse>(HttpStatus.NOT_FOUND);
        }
        Post post = opt.get();

        Comment c = new Comment();
        c.setPost(post);
        c.setAuthor(me);
        c.setContent(req.getContent());
        c.setCreatedAt(LocalDateTime.now());

        Comment saved = commentRepo.save(c);
        return ResponseEntity.status(HttpStatus.CREATED).body(toCommentResponse(saved));
    }

    // ---------- MAPPEREK ----------

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
}
