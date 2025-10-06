package com.example.carapp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

/**
 * JWT tokenek generálása és ellenőrzése.
 * - HMAC SHA-256 aláírás (szimmetrikus kulcs)
 * - subject = felhasználó email
 * - lejárat (expiration) kezelése
 */

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    /**
     * A secret és az expiration konfigurációból jön (application.properties/yml).
     * secret: legalább 256 bites (32+ char), hogy HS256-hoz biztosan elég legyen.
     */
    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    // Új JWT generálása a felhasználó email-jével, mint subject.
    public String generateToken(String subjectEmail) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .setSubject(subjectEmail)      // subject = email
                .setIssuedAt(now)              // kibocsátás ideje
                .setExpiration(exp)            // lejárat
                .signWith(key, SignatureAlgorithm.HS256) // HS256 aláírás
                .compact();
    }

    // Email kiolvasása a tokenből
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Token érvényesség ellenőrzése
    // nem járt le
    // subject megyezik a várt emaillel
    public boolean isTokenValid(String token, String expectedEmail) {
        String username = extractUsername(token);
        return (username != null && username.equals(expectedEmail) && !isTokenExpired(token));
    }

    // --- private segédfüggvények ---
    private boolean isTokenExpired(String token) {
        Date exp = extractClaim(token, Claims::getExpiration);
        return exp.before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return resolver.apply(claims);
    }
}
