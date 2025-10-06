package com.example.carapp.dto;

import java.time.LocalDateTime;

public class NewsItem {
    private String title;
    private String link;
    private String source;
    private LocalDateTime publishedAt;

    public NewsItem() {}

    public NewsItem(String title, String link, String source, LocalDateTime publishedAt) {
        this.title = title;
        this.link = link;
        this.source = source;
        this.publishedAt = publishedAt;
    }

    public String getTitle() { return title; }
    public String getLink() { return link; }
    public String getSource() { return source; }
    public LocalDateTime getPublishedAt() { return publishedAt; }

    public void setTitle(String title) { this.title = title; }
    public void setLink(String link) { this.link = link; }
    public void setSource(String source) { this.source = source; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }
}
