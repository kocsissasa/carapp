package com.example.carapp.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

//  --- Felhasználót reprezentál ---
//      Mezők:
//          id, name, email, password – alap adatok.
//          role – szerepkör (USER vagy ADMIN).
//      Szabályok:
//          email egyedi kell legyen.
//          password minimum 6 karakter.
//          @JsonProperty miatt a jelszó csak befelé megy, a response-okban nem jelenik meg.
//          Egy felhasználónak több autója, több posztja és több kommentje is lehet.

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name cannot be empty") // -> Kötelező mező
    private String name;

    @Email(message = "Email must be valid")  // -> E-mail formátum ellenőrzése
    @NotBlank(message = "Email is required") // -> Kötelező mező
    @Column(unique = true) // -> Egyedi index/constraint az adatbázisban
    private String email;

    @NotBlank(message = "Password is required") // -> Kötelező
    @Size(min = 6, message = "Password must be at least 6 characters long")  // -> Minimum hossz
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) // request-ben beolvasható, response-ban nem jön vissza
    private String password;

    @Enumerated(EnumType.STRING) // -> Enum szövegként tárolva
    @Column(nullable = false)  // -> Nem lehet null
    private Role role = Role.USER; // -> Alapértelmezett szerep

    public User() {}

    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password; // -> Hash-elés a service/controller rétegben
        this.role = Role.USER;
    }

    public User(String name, String email, String password, Role role) {
        this.name = name;
        this.email = email;
        this.password = password; // -> Hash-elés szükséges mentés előtt
        this.role = role == null ? Role.USER : role;
    }

    // getters & setters
    public Long getId() { return id; }  // -> PK lekérése
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; } // -> Név
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; } // -> E-mail
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; } // -> Getter létezik, de WRITE_ONLY miatt JSON-ban NEM jelenik meg
    public void setPassword(String password) { this.password = password; }

    public Role getRole() { return role; } // -> Szerep (USER/ADMIN)
    public void setRole(Role role) { this.role = role == null ? Role.USER : role; }
}
