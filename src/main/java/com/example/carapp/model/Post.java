package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

//      --- Fórum bejegyzés entitás ---
// *       Mezők:
// *           id – elsődleges kulcs.
// *           author – a szerző (User).
// *           title, content – poszt címe és tartalma.
// *           category – a poszt kategóriája.
// *           rating – opcionális értékelés (pl. szerviz tapasztalat).
// *           createdAt, updatedAt – létrehozás és utolsó frissítés ideje.
// *           Egy User több posztot is írhat.

@Entity
@Table(name = "forum_posts")
public class Post {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "author_id")
    private User author;

    @NotBlank @Size(max = 120)
    private String title;

    @NotBlank @Size(max = 5000)
    @Column(length = 5000)
    private String content;

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private ForumCategory category = ForumCategory.GENERAL;

    private Integer rating; // opcionális (SERVICE kategóriában értelmezett)

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

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
