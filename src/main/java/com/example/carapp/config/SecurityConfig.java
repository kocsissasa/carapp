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

/** Ez az osztály kezeli a biztonsági beállításokat:
 * -JWT alapú hitelesítés
 * -Jogosultságok
 * CORS engedélyezés frontendhez
 */

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    // Meghatározza, hogy mely végpontokat ki és hogyan érhet el

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Frontend felől érkező kérések
                .cors(Customizer.withDefaults())

                // CSRF védelem kikapcsolása
                .csrf(csrf -> csrf.disable())

                // JWT alapú hitelesítés van a "session" helyett
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Jogosultsági szabályok
                .authorizeHttpRequests(auth -> auth

                        // Preflight kérések mindenhol engedve
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Auth végpontok (login/register) szabadok
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/users").permitAll()

                        // Publikus GET autók végpont
                        .requestMatchers(HttpMethod.GET, "/api/cars").permitAll()

                        // Admin végpontok csak admin jogosultsággal elérhetőek
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")

                        // Autók és időpontok - írás/törléshez be kell lépni
                        .requestMatchers("/api/cars/**").authenticated()
                        .requestMatchers("/api/appointments/**").authenticated()

                        // Védett felhasználói adatok
                        .requestMatchers("/api/users/**").authenticated()

                        // Fórum: olvasás: publikus, szerkesztés: beléptetett felhasználók számára

                        .requestMatchers(HttpMethod.GET, "/api/forum/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/forum/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/forum/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/forum/**").authenticated()

                        // Minden más engedett
                        .anyRequest().permitAll()
                )
                // Token ellenőrzések kérések előtt
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Ha több origin kell, add őket a listához
        config.setAllowedOrigins(List.of("http://localhost:5173"));  // frontend portja
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // Authorization header engedélyezése

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // Jelszavak hash-elésére szolgál, az adatbázisban minden jelszó hash-elve tárolódik
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
