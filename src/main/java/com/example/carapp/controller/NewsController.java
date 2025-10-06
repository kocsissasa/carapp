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

    /** Útinform – közvetlenül az oldalról */
    @GetMapping("/utinform")
    public List<NewsItem> utinform(@RequestParam(defaultValue = "6") int limit) throws Exception {
        return news.fetchUtinformFromSite(limit);
    }

    /** Totalcar tesztek – közvetlenül az oldalról */
    @GetMapping("/totalcar")
    public List<NewsItem> totalcar(@RequestParam(defaultValue = "6") int limit) throws Exception {
        return news.fetchTotalcarFromSite(limit);
    }
}
