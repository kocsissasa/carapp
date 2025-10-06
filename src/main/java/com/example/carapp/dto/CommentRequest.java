package com.example.carapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** ÚJ kommeent létrehozásához
 * Csak a szövegét tartalmazza
 * Nem lehet nagyobb, mint 2000 karakter és nem lehet üres sem
 */

public class CommentRequest {
    @NotBlank @Size(max = 2000)
    private String content;

    // getters/setters
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
