package com.example.carapp.controller;

import com.example.carapp.dto.NewsItem;
import com.example.carapp.service.NewsService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
*   - A service rétegben történik az adatok feldolgozása, itt csak az endpointokat definiáljuk.
*   - A NewsService segítségével dolgozik, amely a tényleges adatgyűjtést végzi
*/
@RestController
@RequestMapping("/api/news") // -> Az összes végpont az /api/news alatt érhető el
public class NewsController {
    // --- Szerviz réteg injektálása ---
    private final NewsService news; // -> A NewsService objektum, ami a híreket gyűjti
    public NewsController(NewsService news) { this.news = news; }

    // A limit paraméter határozza meg, hány hírt kérjünk le (default: 20)
    // Totalcar hírek (autótesztek, újdonságok)
    @GetMapping("/totalcar")
    public List<NewsItem> totalcar(@RequestParam(defaultValue = "20") int limit) throws Exception {
        return news.fetchTotalCarTests(limit); // -> Meghívjuk a service metódust, visszaadjuk az eredményt
    }

    // Hivatalos Útinform hírek (útlezárás, baleset stb.)
    // A limit paraméter határozza meg, hány hírt kérjünk le (default: 20)
    @GetMapping("/utinform")
    public List<NewsItem> utinform(@RequestParam(defaultValue = "20") int limit) throws Exception {
        return news.fetchUtinformFromSite(limit);
    }

    // Alternatív útvonal – hírek a Hirhanyó vagy más adatforrásból
    @GetMapping("/utinform-hirhanyo")
    public List<NewsItem> utinformHirhanyo(@RequestParam(defaultValue = "20") int limit) throws Exception {
        return news.fetchHirhanyoUtinfo(limit); // -> A service másik metódusát hívja, ami egy alternatív forrásból olvas
    }
}