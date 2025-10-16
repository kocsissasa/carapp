package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity  // -> Ez az osztály egy perzisztens JPA entitás
@Table(name = "forum_posts") // -> DB tábla neve: forum_posts
public class Post {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) // -> Elsődleges kulcs
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "author_id") // -> több poszt tartozhat egy Userhez
    private User author;

    @Size(max = 120) // -> Cím max. 120 karakter lehet
    private String title; // opcionális

    @NotBlank // -> Tartalom kötelező
    @Column(nullable = false, length = 2000)
    private String content;

    @Enumerated(EnumType.STRING) // -> Enum értéket szövegként tároljuk
    @Column(nullable = false) // -> Nem lehet null
    private ForumCategory category = ForumCategory.GENERAL; // -> Alapértelmezett kategória

    private Integer rating; // opcionális (1–5)

    @Column(nullable = false) private LocalDateTime createdAt; // -> Létrehozás időpontja
    @Column(nullable = false) private LocalDateTime updatedAt; // -> Utolsó módosítás időpontja


    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now(); // -> createdAt beállítása mostani időre
        this.updatedAt = this.createdAt;  // -> updatedAt = createdAt
        if (this.category == null) this.category = ForumCategory.GENERAL; // -> null esetén is legyen DEFAULT
    }

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    // getters/setters
    public Long getId() { return id; }
    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public ForumCategory getCategory() { return category; }
    public void setCategory(ForumCategory category) { this.category = category; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
