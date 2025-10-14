package com.example.carapp.dto;

import com.example.carapp.model.ReactionType;

/**
 * Reakció beküldéséhez használt DTO.
 * Legalább az egyik mező kitölthető:
 *  - emoji  : pl. "👍" vagy "like"
 *  - type   : közvetlen enum (opcionális)
 */
public class ReactionRequest {

    private String emoji;           // kliens legtöbbször ezt küldi
    private ReactionType type;      // opcionális – ha közvetlen enumot küldünk

    public String getEmoji() {
        return emoji;
    }
    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }

    public ReactionType getType() {
        return type;
    }
    public void setType(ReactionType type) {
        this.type = type;
    }
}
