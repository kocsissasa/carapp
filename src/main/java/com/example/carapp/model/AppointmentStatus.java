package com.example.carapp.model;

public enum AppointmentStatus {
    PENDING,    // Időpont lefoglalva, de még nincs jóváhagyva
    CONFIRMED,  // Időpont jóváhagyva
    CANCELLED   // Időpont törölve/lemondva
}
