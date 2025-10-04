package com.example.carapp.dto;

import com.example.carapp.model.ForumCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PostRequest {
    @NotBlank @Size(max = 120)
    private String title;

    @NotBlank @Size(max = 5000)
    private String content;

    private ForumCategory category = ForumCategory.GENERAL;
    private Integer rating; // opcionális (1-5)

    // getters/setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public ForumCategory getCategory() { return category; }
    public void setCategory(ForumCategory category) { this.category = category; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
}
