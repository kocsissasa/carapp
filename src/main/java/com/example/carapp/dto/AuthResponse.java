package com.example.carapp.dto;

/**
 * Login/Register után visszaadott objektum
 * Tartalmazza a JWT tokent
 * minden kérésnél Authorization headerben visszaküldi
 */

public class AuthResponse {

    private String token;

    public AuthResponse() {}

    public AuthResponse(String token) {
        this.token = token;
    }

    public String getToken() {
        return token;
    }
    public void setToken(String token) {
        this.token = token;
    }
}
