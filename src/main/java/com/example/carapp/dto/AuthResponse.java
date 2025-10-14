package com.example.carapp.dto;

/**
 * Login/Register után visszaadott objektum
 * Tartalmazza a JWT tokent
 * minden kérésnél Authorization headerben visszaküldi
 */

public class AuthResponse {

    private String token; // -> A kiállított JWT

    public AuthResponse() {} // -> Üres konstruktor

    public AuthResponse(String token) { // -> Közvetlen beállításhoz
        this.token = token;  // -> Mező inicializálása
    }

    public String getToken() {
        return token;
    }
    public void setToken(String token) {
        this.token = token;
    }
}
