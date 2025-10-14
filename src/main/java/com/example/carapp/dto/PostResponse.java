package com.example.carapp.dto;

import com.example.carapp.model.ForumCategory;

import java.time.LocalDateTime;

public class PostResponse { // Kimenő DTO egy fórumposzthoz
    private Long id; // Poszt azonosító (DB id)
    private Long authorId; // Szerző felhasználó ID-ja
    private String authorName; // Szerző megjelenítendő neve

    private String title;          // lehet null
    private String content;  // Poszt szövegtartalma

    private ForumCategory category; // Kategória (enum)
    private Integer rating;        // lehet null

    private LocalDateTime createdAt; // Létrehozás ideje
    private LocalDateTime updatedAt; // Utolsó módosítás ideje

    // --- Getters/Setters ---
    // SZERIALIZÁLÁS: Jackson ezeken a getteren keresztül olvassa ki a JSON-hoz
    // DESZERIALIZÁLÁS: Ha a jövőben JSON-ből olvasnánk
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

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
