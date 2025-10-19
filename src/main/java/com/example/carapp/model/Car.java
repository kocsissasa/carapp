package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/*
*    --- Egy autót reprezentál az adatbázisban ---
*   Mezők:
*       id – elsődleges kulcs.
*       brand, model, year – kötelező adatok az autóról.
*       owner – kapcsolat a felhasználóval (User), aki birtokolja az autót.
*       Egy usernek több autója is lehet → @ManyToOne kapcsolat.
 */

@Entity
@Table(name = "cars") // -> Tábla neve az adatbázisban
public class Car {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Brand is required")  // -> Kötelező mező
    private String brand;

    @NotBlank(message = "Model is required")  // -> Kötelező mező
    private String model;

    @NotNull(message = "Year is required")  // -> Kötelező mező
    private Integer year;

    // kapcsolat Userrel: egy usernek több autója lehet
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    public Car() {}

    public Car(String brand, String model, Integer year, User owner) {
        this.brand = brand;
        this.model = model;
        this.year = year;
        this.owner = owner;
    }

    // getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
}
