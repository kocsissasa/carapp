package com.example.carapp.dto;

import jakarta.validation.constraints.NotBlank;

public class ServiceCenterRequest { // -> KLIENS → SZERVER: új szervizközpont létrehozásához szükséges adatok
    @NotBlank private String name; // -> KÖTELEZŐ: név
    @NotBlank private String city; // -> KÖTELEZŐ: város
    @NotBlank private String address; // -> KÖTELEZŐ: cím
    private String placeId; // -> opcionális

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPlaceId() { return placeId; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }
}
