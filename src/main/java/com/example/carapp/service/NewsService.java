package com.example.carapp.service;

import com.example.carapp.dto.NewsItem;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NewsService {

    /* ---------- Általános beállítások ---------- */

    private static final int TIMEOUT_MS = 12000;

    /** Emberibb User-Agent + referrer: sok anti-botnál életmentő. */
    private static final String UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    /* ============================================================
       ===============        PUBLIC API        ====================
       ============================================================ */

    /** TOTALCAR – a legújabb tesztek a fő listáról. */
    public List<NewsItem> fetchTotalCarTests(int limit) throws Exception {
        final String url = "https://totalcar.hu/tesztek/";
        Document doc = loadHtml(url);

        // Elég változó a markup – menjünk biztosra, sok hivatkozást megfogunk,
        // majd domain / útvonal és cím alapján szűrünk.
        Elements anchors = new Elements();
        anchors.addAll(doc.select("main a[href]"));
        anchors.addAll(doc.select("article a[href], .article a[href]"));
        anchors.addAll(doc.select(".post, .listing, .cikk, .grid a[href]"));
        anchors.addAll(doc.select("h2 a[href], h3 a[href]"));

        // csak a tesztek al-oldalait engedjük
        List<NewsItem> items = collectFromAnchors(url, anchors, "Totalcar", limit)
                .stream()
                .filter(n -> {
                    try {
                        URI u = URI.create(n.getLink());
                        return u.getHost() != null
                                && u.getHost().contains("totalcar.hu")
                                && u.getPath() != null
                                && (u.getPath().startsWith("/tesztek/")
                                || u.getPath().contains("/teszt"));
                    } catch (Exception ignored) {
                        return false;
                    }
                })
                .collect(Collectors.toList());

        // ha kevés lenne, egészítsük ki Google News-szal (site szűrő)
        if (items.size() < Math.min(limit, 6)) {
            items = uniqueByLinkAndTitle(
                    items,
                    fetchFromGoogleNews("totalcar.hu", "teszt", limit, "Totalcar"),
                    limit
            );
        }
        return items;
    }

    /** ÚTINFORM – közvetlenül az utinform.hu híroldalról, agresszívebb letöltéssel. */
    public List<NewsItem> fetchUtinformFromSite(int limit) throws Exception {
        final String url = "https://www.utinform.hu/hu/news?d=0";

        Document doc;
        try {
            doc = loadHtml(url);
        } catch (Exception e) {
            // ha a site blokkol / időtúllépés, egyből Google News fallback
            return fetchFromGoogleNews("utinform.hu", "", limit, "Útinform");
        }

        Elements anchors = new Elements();
        // több szelektor – gyakran változik a markup
        anchors.addAll(doc.select("main a[href]"));
        anchors.addAll(doc.select(".content a[href], .news-list a[href], .container a[href]"));
        anchors.addAll(doc.select("article a[href], .list a[href], .row a[href]"));
        anchors.addAll(doc.select("h1 a[href], h2 a[href], h3 a[href]"));

        List<NewsItem> items = collectFromAnchors(url, anchors, "Útinform", limit)
                .stream()
                .filter(n -> isHttp(n.getLink()))
                .collect(Collectors.toList());

        // ha kevés/üres: Google News kiegészítés
        if (items.isEmpty() || items.size() < Math.min(limit, 4)) {
            items = uniqueByLinkAndTitle(
                    items,
                    fetchFromGoogleNews("utinform.hu", "", limit, "Útinform"),
                    limit
            );
        }
        return items;
    }

    /** ÚTINFORM – alternatív forrás a HírHányó „Útinfó” gyűjtőoldaláról. */
    public List<NewsItem> fetchHirhanyoUtinfo(int limit) throws Exception {
        final String url = "https://hirhanyo.hu/hirek/utinfo/";
        Document doc = loadHtml(url);

        Elements anchors = new Elements();
        anchors.addAll(doc.select("main a[href]"));
        anchors.addAll(doc.select(".post-list a[href], .card a[href]"));
        anchors.addAll(doc.select("article a[href], h2 a[href], h3 a[href]"));

        // Csak a hirhanyo.hu/hirek/... cikkeket engedjük.
        List<NewsItem> items = collectFromAnchors(url, anchors, "HírHányó — Útinfó", limit)
                .stream()
                .filter(n -> {
                    try {
                        URI u = URI.create(n.getLink());
                        return u.getHost() != null
                                && u.getHost().contains("hirhanyo.hu")
                                && u.getPath() != null
                                && u.getPath().startsWith("/hirek/");
                    } catch (Exception ignored) {
                        return false;
                    }
                })
                .collect(Collectors.toList());

        // Ha kevés, egy finom Google News rásegítés útinfó kulcsszóval
        if (items.size() < Math.min(limit, 6)) {
            items = uniqueByLinkAndTitle(
                    items,
                    fetchFromGoogleNews("hirhanyo.hu", "Útinfó", limit, "HírHányó — Útinfó"),
                    limit
            );
        }
        return items;
    }

    /* ============================================================
       ===============      SEGÉD FÜGGVÉNYEK      =================
       ============================================================ */

    private Document loadHtml(String url) throws Exception {
        // Agresszívebb, valós böngészőre emlékeztető kérés
        return Jsoup.connect(url)
                .userAgent(UA)
                .referrer("https://www.google.com/")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7")
                .timeout(TIMEOUT_MS)
                .ignoreHttpErrors(true)
                .get();
    }

    /** Google News keresés – „site:domain + extra” stílusban. */
    private List<NewsItem> fetchFromGoogleNews(String site, String extraQuery, int limit, String sourceLabel) throws Exception {
        String q = "site:" + site + (extraQuery == null || extraQuery.isBlank() ? "" : " " + extraQuery);
        String encoded = URLEncoder.encode(q, StandardCharsets.UTF_8);
        String url = "https://news.google.com/rss/search?q=" + encoded + "&hl=hu&gl=HU&ceid=HU:hu";

        Document doc = Jsoup.connect(url)
                .userAgent(UA)
                .referrer("https://www.google.com/")
                .timeout(TIMEOUT_MS)
                .get();

        List<NewsItem> items = new ArrayList<>();
        for (Element item : doc.select("item")) {
            String title = safeTrim(textOf(item.selectFirst("title")));
            String link = safeTrim(textOf(item.selectFirst("link")));
            if (!title.isBlank() && isHttp(link)) {
                items.add(new NewsItem(title, link, sourceLabel, LocalDateTime.now()));
                if (items.size() >= limit) break;
            }
        }
        return items;
    }

    /** Sokféle markupból gyűjtünk cikk-címeket + linkeket, aztán normalizálunk és szűrünk. */
    private List<NewsItem> collectFromAnchors(String baseUrl, Elements anchors, String source, int limit) {
        List<NewsItem> out = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>(); // link + title duplikátumszűrő

        for (Element a : anchors) {
            String title = safeTrim(a.text());
            if (title.isBlank()) continue;

            String href = a.hasAttr("abs:href") ? a.attr("abs:href") : a.attr("href");
            if (href == null || href.isBlank()) continue;
            href = makeAbsolute(baseUrl, href);
            if (!isHttp(href)) continue;

            // triviális sallangok kiszűrése
            if (href.endsWith("#") || href.contains("#comments")) continue;

            String key = normalize(title) + "||" + normalize(href);
            if (seen.add(key)) {
                out.add(new NewsItem(title, href, source, LocalDateTime.now()));
                if (out.size() >= limit) break;
            }
        }
        return out;
    }

    /** Két lista „összefésülése” duplikátumok nélkül (link+title alapján). */
    private List<NewsItem> uniqueByLinkAndTitle(List<NewsItem> base, List<NewsItem> add, int limit) {
        LinkedHashMap<String, NewsItem> map = new LinkedHashMap<>();
        for (NewsItem n : base) map.put(normalize(n.getTitle()) + "||" + normalize(n.getLink()), n);
        for (NewsItem n : add) {
            String k = normalize(n.getTitle()) + "||" + normalize(n.getLink());
            map.putIfAbsent(k, n);
            if (map.size() >= limit) break;
        }
        return new ArrayList<>(map.values()).subList(0, Math.min(limit, map.size()));
    }

    private static String textOf(Element e) {
        return e == null ? "" : e.text();
    }

    private static String safeTrim(String s) {
        return s == null ? "" : s.trim();
    }

    private static boolean isHttp(String url) {
        try {
            return url != null && (url.startsWith("http://") || url.startsWith("https://"));
        } catch (Exception e) { return false; }
    }

    private static String makeAbsolute(String base, String href) {
        try {
            URL u = new URL(new URL(base), href);
            return u.toString();
        } catch (Exception ignored) {
            return href;
        }
    }

    private static String normalize(String s) {
        if (s == null) return "";
        String t = s.trim().toLowerCase(Locale.ROOT);
        t = t.replaceAll("\\s+", " ");
        // néhány tipikus UTM/szerviz paraméter kiszórása
        t = t.replaceAll("([?&])(utm_[^=]+|gclid|fbclid)=[^&]+", "");
        return t;
    }
}
