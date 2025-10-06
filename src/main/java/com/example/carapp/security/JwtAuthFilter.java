package com.example.carapp.security;

import com.example.carapp.repository.UserRepository;
import com.example.carapp.security.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Minden bejövő HTTP kérésnél egyszer lefutó szűrő.
 *  Feladata:
 *      - Beolvasni az Authorization fejlécből a Bearer tokent
 *      - Érvényesíteni a JWT-t
 *      - Ha érvényes, beállítani a SecurityContext-be az autentikációt (felhasználó + jogosultságok)
 */

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    /**
     * Ezeket az útvonalakat NEM szűrjük (pl. /api/auth/** → login/register)
     * Így az auth végpontokra nem kell token.
     */

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getServletPath();
        // Auth végpontok (register, login) SOHA ne menjenek át a JWT ellenőrzésen
        return path.startsWith("/api/auth");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 1) Authorization fejléc kinyerése
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2) Token + subject (email)
        String token = authHeader.substring(7);
        String email = jwtService.extractUsername(token); // az email a subject

       // 3) Ha még nincs autentikáció a SecurityContext-ben, megpróbáljuk beállítani
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            var userOpt = userRepository.findByEmail(email);

        // 4) Token ellenőrzés + user létezés
            if (userOpt.isPresent() && jwtService.isTokenValid(token, email)) {
                var user = userOpt.get();

                // 5) Jogosultságok összeállítása
                // FONTOS: authority = "ADMIN" vagy "USER" (nem ROLE_ előtag!)
                var authorities = List.of(new SimpleGrantedAuthority(user.getRole().name()));

                // 6) Authentication objektum összeállítása és SecurityContext-be tétele
                var authToken = new UsernamePasswordAuthenticationToken(
                        email,               // principal (lehet maga a user is, de az email is elég)
                        null,                // credentials nincs
                        authorities          // <- hatóságok/user
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // 7) Továbbengedjük a kérést
        filterChain.doFilter(request, response);
    }
}
