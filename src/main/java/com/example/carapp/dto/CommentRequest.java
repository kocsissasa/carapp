package com.example.carapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CommentRequest {
    @NotBlank @Size(max = 2000)
    private String content;

    // getters/setters
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
