package com.example.carapp.service;

import com.example.carapp.dto.NewsItem;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NewsService {

    private static final int TIMEOUT_MS = 15000;
    private static final String UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    /* ==========================
       TOTALCAR – közvetlen scrape
       ========================== */
    public List<NewsItem> fetchTotalcarFromSite(int limit) throws Exception {
        final String url = "https://totalcar.hu/tesztek/";
        Document doc = baseConnect(url).get();

        Elements links = new Elements();
        links.addAll(doc.select("article a[href]"));
        links.addAll(doc.select("h1 a[href], h2 a[href], h3 a[href]"));
        if (links.isEmpty()) links = doc.select("a[href]");

        return pickArticles(
                links,
                "https://totalcar.hu",
                "/tesztek/",
                "Totalcar",
                limit
        );
    }

    /* ==========================
       ÚTINFORM – közvetlen scrape + fallbackok
       ========================== */
    public List<NewsItem> fetchUtinformFromSite(int limit) throws Exception {
        List<NewsItem> first = scrapeUtinformList("https://www.utinform.hu/hu/news?d=0", limit);
        if (!first.isEmpty()) return first;

        List<NewsItem> second = scrapeUtinformList("https://www.utinform.hu/hu", limit);
        if (!second.isEmpty()) return second;

        List<NewsItem> third = tryGenericAnchors(
                "https://www.utinform.hu/hu",
                "https://www.utinform.hu",
                Arrays.asList("/hu/news", "/hu/hirek"),
                "Útinform",
                limit
        );
        if (!third.isEmpty()) return third;

        return Collections.singletonList(
                new NewsItem(
                        "Útinform hírek ideiglenesen nem érhetők el – kattints ide a térképre",
                        "https://www.utinform.hu/hu/map?d=0&n=1&l=abc&v=19.50330,47.16250,7",
                        "Útinform",
                        LocalDateTime.now()
                )
        );
    }

    /* ==========================
       Segédek
       ========================== */

    private Connection baseConnect(String url) {
        return Jsoup
                .connect(url)
                .userAgent(UA)
                .referrer("https://www.google.com")
                .timeout(TIMEOUT_MS)
                .followRedirects(true)
                .ignoreHttpErrors(true)
                .ignoreContentType(true)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Cache-Control", "no-cache");
    }

    private List<NewsItem> pickArticles(
            Elements rawLinks,
            String mustStartWithDomain,
            String pathFragmentMustContain,
            String sourceLabel,
            int limit
    ) {
        Set<String> seen = new LinkedHashSet<>();
        List<NewsItem> out = new ArrayList<>();

        for (Element a : rawLinks) {
            String text = safeTrim(a.text());
            String href = a.hasAttr("abs:href") ? a.attr("abs:href") : a.attr("href");

            if (href == null || href.isBlank()) continue;
            if (!href.startsWith("http")) {
                try { href = a.absUrl("href"); } catch (Exception ignored) {}
            }
            if (!href.startsWith(mustStartWithDomain)) continue;
            if (pathFragmentMustContain != null && !pathFragmentMustContain.isBlank()) {
                if (!href.contains(pathFragmentMustContain)) continue;
            }
            if (text.length() < 6) continue;
            if (!seen.add(href)) continue;

            out.add(new NewsItem(text, href, sourceLabel, LocalDateTime.now()));
            if (out.size() >= Math.max(1, limit)) break;
        }
        return out;
    }

    private List<NewsItem> scrapeUtinformList(String url, int limit) throws Exception {
        Document doc = baseConnect(url).get();

        List<Elements> candidateGroups = Arrays.asList(
                doc.select("main .news-list a[href]"),
                doc.select("main article a[href]"),
                doc.select("section .news a[href]"),
                doc.select("main a[href]")
        );

        for (Elements group : candidateGroups) {
            List<NewsItem> picked = pickArticles(
                    group,
                    "https://www.utinform.hu",
                    "/hu/news",
                    "Útinform",
                    limit
            );
            if (!picked.isEmpty()) return picked;
        }

        Elements all = doc.select("a[href]");
        List<NewsItem> looser = all.stream()
                .filter(a -> {
                    String href = a.hasAttr("abs:href") ? a.attr("abs:href") : a.attr("href");
                    if (href == null || href.isBlank()) return false;
                    if (!href.startsWith("http")) {
                        try { href = a.absUrl("href"); } catch (Exception ignored) {}
                    }
                    return href.startsWith("https://www.utinform.hu")
                            && (href.contains("/hu/news") || href.contains("/hu/hirek"));
                })
                .map(a -> {
                    String text = safeTrim(a.text());
                    String href = a.hasAttr("abs:href") ? a.attr("abs:href") : a.attr("href");
                    if (!href.startsWith("http")) {
                        try { href = a.absUrl("href"); } catch (Exception ignored) {}
                    }
                    return new NewsItem(text, href, "Útinform", LocalDateTime.now());
                })
                .filter(n -> n.getTitle() != null && n.getTitle().length() >= 6)  // << GETTER
                .collect(Collectors.toList());

        LinkedHashMap<String, NewsItem> uniqByLink = new LinkedHashMap<>();
        for (NewsItem n : looser) {
            uniqByLink.putIfAbsent(n.getLink(), n);                                // << GETTER
            if (uniqByLink.size() >= limit) break;
        }
        return new ArrayList<>(uniqByLink.values());
    }

    private List<NewsItem> tryGenericAnchors(
            String url,
            String mustStartWithDomain,
            List<String> pathFragments,
            String sourceLabel,
            int limit
    ) throws Exception {
        Document doc = baseConnect(url).get();
        Elements links = doc.select("a[href]");
        Set<String> seen = new LinkedHashSet<>();
        List<NewsItem> out = new ArrayList<>();

        for (Element a : links) {
            String text = safeTrim(a.text());
            String href = a.hasAttr("abs:href") ? a.attr("abs:href") : a.attr("href");

            if (href == null || href.isBlank()) continue;
            if (!href.startsWith("http")) {
                try { href = a.absUrl("href"); } catch (Exception ignored) {}
            }
            if (!href.startsWith(mustStartWithDomain)) continue;
            if (pathFragments != null && !pathFragments.isEmpty()) {
                boolean ok = false;
                for (String frag : pathFragments) {
                    if (href.contains(frag)) { ok = true; break; }
                }
                if (!ok) continue;
            }
            if (text.length() < 6) continue;
            if (!seen.add(href)) continue;

            out.add(new NewsItem(text, href, sourceLabel, LocalDateTime.now()));
            if (out.size() >= Math.max(1, limit)) break;
        }
        return out;
    }

    private static String safeTrim(String s) {
        return s == null ? "" : s.replaceAll("\\s+", " ").trim();
    }
}
