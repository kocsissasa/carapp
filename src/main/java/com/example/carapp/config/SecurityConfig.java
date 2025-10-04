package com.example.carapp.config;

import com.example.carapp.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

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
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Auth (login/register) szabad
                        .requestMatchers("/api/auth/**").permitAll()
                        // Ha a regisztráció a /api/users POST-on is elérhető:
                        .requestMatchers(HttpMethod.POST, "/api/users").permitAll()

                        // Publikus olvasás (ha szeretnéd nyitva hagyni a lista végpontot)
                        .requestMatchers(HttpMethod.GET, "/api/cars").permitAll()

                        // Admin felület/endpointok
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")

                        // Autók és időpontok – minden más művelethez bejelentkezés kell
                        .requestMatchers("/api/cars/**").authenticated()
                        .requestMatchers("/api/appointments/**").authenticated()

                        // Users (profil stb.)
                        .requestMatchers("/api/users/**").authenticated()

                        // Fórum: olvasás publikus, írás auth-hoz kötött
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

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
