// com/example/carapp/model/PostReaction.java
package com.example.carapp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity // -> JPA entitás: tábla rekordját reprezentálja
@Table(
        name = "post_reactions", // -> Tábla neve
        uniqueConstraints = @UniqueConstraint( // -> Egyedi megszorítás a táblán
                name = "uk_post_user", columnNames = {"post_id", "user_id"} // -> Egy user posztonként csak 1 reakciót adhat
        )
)
public class PostReaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "post_id") // -> Sok reakció tartozhat egy poszthoz
    private Post post;

    @ManyToOne(optional = false) @JoinColumn(name = "user_id") // -> Sok reakció tartozhat egy userhez
    private User user;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) // -> Enumot szövegként tároljuk / Nem lehet null
    private ReactionType type;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now(); // -> Létrehozás ideje

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now(); // -> Utolsó módosítás

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); } // -> Bármely update előtt frissítjük az updatedAt-et

    public Long getId() { return id; }
    public Post getPost() { return post; } // -> Kapcsolt poszt
    public void setPost(Post post) { this.post = post; }
    public User getUser() { return user; } // -> Reagáló felhasználó
    public void setUser(User user) { this.user = user; }
    public ReactionType getType() { return type; } // -> Reakció típusa
    public void setType(ReactionType type) { this.type = type; }
    public LocalDateTime getCreatedAt() { return createdAt; } // -> Létrehozás időpontja
    public LocalDateTime getUpdatedAt() { return updatedAt; } // -> Módosítás időpontja
}
