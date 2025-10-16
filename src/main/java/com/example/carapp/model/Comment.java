package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/*
*   --- Fórum hozzászólás entitás ---
*      Mezők:
*         id – elsődleges kulcs.
*         post – melyik poszthoz tartozik.
*         author – a komment szerzője (User).
*         content – hozzászólás szövege (max. 2000 karakter).
*         createdAt – mikor jött létre.
*         @ManyToOne kapcsolatok: minden komment egy Post-hoz és egy User-hez tartozik.
 */

@Entity // -> JPA entitás: perzisztens osztály (DB tábla rekordját reprezentálja)
@Table(name = "forum_comments") // -> Tábla neve az adatbázisban
public class Comment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) // -> Elsődleges kulcs
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "post_id") // -> Több komment tartozhat egy poszthoz
    private Post post;

    @ManyToOne(optional = false) @JoinColumn(name = "author_id") // -> Több komment tartozhat egy userhez
    private User author;

    @NotBlank @Size(max = 2000) // -> Validáció: nem lehet null/ Max 2000 karakter
    @Column(length = 2000) // -> Validáció: legfeljebb 2000 karakter
    private String content;

    private LocalDateTime createdAt = LocalDateTime.now(); // -> Létrehozás ideje

    // getters/setters
    public Long getId() { return id; }  // -> Elsődleges kulcs lekérése
    public Post getPost() { return post; }  // -> Kapcsolt Post entitás
    public void setPost(Post post) { this.post = post; }  // -> Kapcsolt Post beállítása
    public User getAuthor() { return author; }  // -> Kapcsolt User
    public void setAuthor(User author) { this.author = author; } // -> Szerző beállítása
    public String getContent() { return content; }  // -> Komment szöveg
    public void setContent(String content) { this.content = content; } // -> Szöveg módosítása
    public LocalDateTime getCreatedAt() { return createdAt; } // -> Létrehozás időpontja
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
