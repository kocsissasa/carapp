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
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CORS engedélyezése Security-n belül
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Preflight (OPTIONS) kérések mindenhol engedve
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Auth (login/register) szabad
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/users").permitAll()

                        // Publikus olvasás (ha így szeretnéd)
                        .requestMatchers(HttpMethod.GET, "/api/cars").permitAll()

                        // Admin végpontok
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                        // ha inkább hasRole-t használsz, akkor a GrantedAuthority legyen "ROLE_ADMIN"

                        // Autók / időpontok – a többi művelethez auth kell
                        .requestMatchers("/api/cars/**").authenticated()
                        .requestMatchers("/api/appointments/**").authenticated()

                        // Users
                        .requestMatchers("/api/users/**").authenticated()

                        // Fórum: olvasás publikus, írás auth
                        .requestMatchers(HttpMethod.GET, "/api/forum/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/forum/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/forum/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/forum/**").authenticated()

                        // Egyéb minden: engedett
                        .anyRequest().permitAll()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // CORS forrás a Security-hez (5173-as frontend engedése)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Ha több origin kell, add őket a listához
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // Authorization header engedése

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
