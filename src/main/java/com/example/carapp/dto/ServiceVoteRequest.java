package com.example.carapp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class ServiceVoteRequest { // -> KLIENS → SZERVER: egy havi szavazat értéke
    @NotNull // -> Kötelező: a JSON-ban szerepelnie kell "rating"-nek
    @Min(1) @Max(5)  // -> Értéktartomány
    private Integer rating; // -> A leadott értékelés

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
}
