package com.example.carapp.dto;

public class ServiceCenterResponse { // -> SZERVER → KLIENS: szervizközpont adatai
    private Long id; // -> Egyedi azonosító
    private String name; // -> Központ neve
    private String city; // -> Város
    private String address; // -> Cím
    private String placeId; // -> Opcionális térkép ID

    // --- Getters: SZERIALIZÁLÁS (objektum -> JSON) Jackson ezeken olvas ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPlaceId() { return placeId; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }
}
