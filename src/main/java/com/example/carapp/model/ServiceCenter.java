package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity // -> JPA entitás
@Table(name = "service_centers")  // -> Tábla neve az adatbázisban
public class ServiceCenter {

    @Id  // -> Elsődleges kulcs
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank  // -> Kötelező mező
    @Column(nullable = false)
    private String name;

    @NotBlank  // -> Kötelező mező
    @Column(nullable = false)
    private String city;

    @NotBlank  // -> Kötelező mező
    @Column(nullable = false)
    private String address;

    // Opcionális: Google Maps placeId (ha később útvonaltervezéshez kell)
    private String placeId;  // -> Lehet null, ha nincs constraint

    public ServiceCenter() {}

    public ServiceCenter(String name, String city, String address) {
        this.name = name;
        this.city = city;
        this.address = address;
    }

    // getters/setters
    public Long getId() { return id; } // -> PK lekérése

    public String getName() { return name; } // -> Név
    public void setName(String name) { this.name = name; }

    public String getCity() { return city; } // -> Város
    public void setCity(String city) { this.city = city; }

    public String getAddress() { return address; } // -> Cím
    public void setAddress(String address) { this.address = address; }

    public String getPlaceId() { return placeId; } // -> Google ID (opcionális)
    public void setPlaceId(String placeId) { this.placeId = placeId; }
}
