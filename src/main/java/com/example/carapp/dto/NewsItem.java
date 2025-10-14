package com.example.carapp.dto;

import java.time.LocalDateTime;

public class NewsItem { // -> Egy hír kártya adatai
    private String title; // -> Cím
    private String link; // -> Forrás URL
    private String source; // -> Forrás neve
    private LocalDateTime publishedAt; // -> Megjelenés ideje

    public NewsItem() {}

    public NewsItem(String title, String link, String source, LocalDateTime publishedAt) {
        this.title = title;
        this.link = link;
        this.source = source;
        this.publishedAt = publishedAt;
    }

    // --- Getters (SZERIALIZÁLÁS: Jackson ezeken olvassa ki a JSON-hoz) ---
    public String getTitle() { return title; }
    public String getLink() { return link; }
    public String getSource() { return source; }
    public LocalDateTime getPublishedAt() { return publishedAt; }

    // --- Setters (DESZERIALIZÁLÁS: Jackson ezeken írja be a JSON-ból) ---
    public void setTitle(String title) { this.title = title; }
    public void setLink(String link) { this.link = link; }
    public void setSource(String source) { this.source = source; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }
}
