package com.example.carapp.controller;

import com.example.carapp.dto.NewsItem;
import com.example.carapp.service.NewsService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService news;

    public NewsController(NewsService news) {
        this.news = news;
    }

    @GetMapping("/totalcar")
    public List<NewsItem> totalcar(@RequestParam(defaultValue = "8") int limit) throws Exception {
        return news.fetchTotalcarTests(limit);
    }

    @GetMapping("/utinform")
    public List<NewsItem> utinform(@RequestParam(defaultValue = "12") int limit) throws Exception {
        return news.fetchUtinform(limit);
    }

    // tesztendpontok – opcionálisak
    @GetMapping("/utinform-hirhanyo")
    public List<NewsItem> utinformHirhanyo(@RequestParam(defaultValue = "12") int limit) throws Exception {
        return news.fetchUtinformFromHirhanyo(limit);
    }

    @GetMapping("/utinform-site")
    public List<NewsItem> utinformSite(@RequestParam(defaultValue = "12") int limit) throws Exception {
        return news.fetchUtinformFromSite(limit);
    }
}
