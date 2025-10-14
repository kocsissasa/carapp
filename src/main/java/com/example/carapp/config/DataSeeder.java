package com.example.carapp.config;

import com.example.carapp.model.*;
import com.example.carapp.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedData(UserRepository userRepo,
                               CarRepository carRepo,
                               ServiceCenterRepository centerRepo,
                               ServiceAppointmentRepository apptRepo,
                               PasswordEncoder passwordEncoder) {
        return args -> {
            // Ha már vannak felhasználók, tekintsük feltöltöttnek a DB-t
            if (userRepo.count() > 0) return;

            // --- USERS ---
            User anna  = new User("Anna",  "anna@example.com",  passwordEncoder.encode("titok123"), Role.ADMIN);
            User apa   = new User("Apa",   "apa@example.com",   passwordEncoder.encode("titok123"), Role.ADMIN);
            User toldi = new User("Toldi", "toldi@example.com", passwordEncoder.encode("titok123"), Role.ADMIN);
            User adzam = new User("Ádzám", "adzam@example.com", passwordEncoder.encode("titok123"), Role.ADMIN);
            userRepo.saveAll(List.of(anna, apa, toldi, adzam));

            // --- CARS ---
            Car corsa  = new Car("Opel",       "Corsa D",   2008, anna);
            Car eklass = new Car("Mercedes",   "E-Class",   2006, apa);
            Car vectra = new Car("Opel",       "Vectra B2", 1999, toldi);
            Car golf4  = new Car("Volkswagen", "Golf 4",    2003, adzam);
            carRepo.saveAll(List.of(corsa, eklass, vectra, golf4));

            // --- SERVICE CENTERS ---
            ServiceCenter sc1 = new ServiceCenter("RapidAuto Szerviz",          "Budapest", "XI., Fehérvári út 12.");
            ServiceCenter sc2 = new ServiceCenter("Platinum Garage",            "Győr",     "Szent István út 5.");
            ServiceCenter sc3 = new ServiceCenter("Műszaki+ Bosch Car Service", "Debrecen", "Nagyerdő krt. 8.");
            centerRepo.saveAll(List.of(sc1, sc2, sc3));

            // --- APPOINTMENTS (center kötelező) ---
            ServiceAppointment a1 = new ServiceAppointment();
            a1.setUser(anna);
            a1.setCar(corsa);
            a1.setCenter(sc1); // <- most már elérhető
            a1.setServiceDateTime(LocalDateTime.now().plusDays(7).withHour(10).withMinute(0));
            a1.setDescription("Olajcsere + átvizsgálás");
            a1.setStatus(AppointmentStatus.PENDING);

            ServiceAppointment a2 = new ServiceAppointment();
            a2.setUser(apa);
            a2.setCar(eklass);
            a2.setCenter(sc2); // <- szintén elérhető
            a2.setServiceDateTime(LocalDateTime.now().plusDays(10).withHour(9).withMinute(30));
            a2.setDescription("Fékbetét csere");
            a2.setStatus(AppointmentStatus.CONFIRMED);

            apptRepo.saveAll(List.of(a1, a2));
        };
    }
}
