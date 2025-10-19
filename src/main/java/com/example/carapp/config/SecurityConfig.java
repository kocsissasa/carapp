package com.example.carapp.config;

import com.example.carapp.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity  // -> Engedélyezi a Spring Security-t a webes környezetben
public class SecurityConfig {

    // -> JWT tokenek ellenőrzésére szolgáló egyedi szűrő
    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // -> A fő biztonsági konfigurációk megadása
        http
                // CORS + CSRF
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable()) // -> CSRF kikapcsolása, mert JWT-vel stateless

                // Stateless kezelése
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Nem tárolunk session-öket, JWT auth történik mindig

                // Jogosultsági szabályok
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // --- Auth endpointok (login, register) ---
                        .requestMatchers("/api/auth/**").permitAll() // -> Auth útvonalak nyitottak
                        .requestMatchers(HttpMethod.POST, "/api/users").permitAll() // -> regisztráció is

                        // --- Szervizközpontok (centers) ---
                        .requestMatchers(HttpMethod.GET, "/api/centers", "/api/centers/top").permitAll() // -> Listázás bárkinek
                        .requestMatchers(HttpMethod.POST, "/api/centers/*/vote").authenticated() // -> Szavazáshoz bekell lépni
                        .requestMatchers("/api/centers/**").hasAuthority("ADMIN") // -> törléshez és módosításhoz ADMIN role

                        // --- Fórum (forum) ---
                        .requestMatchers(HttpMethod.GET, "/api/forum/**").permitAll() // -> Fórum nyilvános
                        .requestMatchers(HttpMethod.POST, "/api/forum/**").authenticated() // -> Írás csak bejelentkezett user számára
                        .requestMatchers(HttpMethod.PUT, "/api/forum/**").authenticated()  // -> Módosítás auth-hoz kötött
                        .requestMatchers(HttpMethod.DELETE, "/api/forum/**").authenticated() // -> Törlés auth-hoz kötött

                        // Reakciók – publikus lekérdezés, írás/törlés auth
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/forum/posts/*/reactions").permitAll() // -> Reakciók lekérdezése publikus
                        .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/forum/posts/*/react").authenticated() // -> Reagálni csak login-nal lehet
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/forum/posts/*/react").authenticated()  // -> saját reakció törlése auth-hoz kötött

                        // Admin útvonalak csak ADMIN jogosultsággal elérhetőek
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")

                        // Egyéb kérések
                        .anyRequest().permitAll()

                )

                // --- JWT filter beillesztése ---
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class); // -> Minden kérést ellenőríz

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        //  CORS beállítások megadása a frontend eléréséhez
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173")); // Frontend origin
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS")); // Engedélyezett HTTP metódusok
        config.setAllowedHeaders(List.of("*")); // Headerek engedélyezettek(auth)
        config.setAllowCredentials(true); // Sütik küldése enabled

        // -> A konfig alkalmazása minden útvonalra
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {

        // BCrypt algoritmus használata a jelszavak titkosításához
        return new BCryptPasswordEncoder();
    }
}
