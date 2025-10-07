package com.example.carapp.service;

import com.example.carapp.dto.NewsItem;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Pattern;

@Service
public class NewsService {

    private static final int TIMEOUT_MS = 14000;
    private static final String UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    + "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    private static final String GENERIC_UTINFORM = "Hiteles közúti közlekedési információk - Útinform";

    private static final Pattern P_TOTALCAR =
            Pattern.compile("^https?://totalcar\\.hu/(teszt|tesztek)/.+", Pattern.CASE_INSENSITIVE);

    private static final Pattern P_HH_UTINFO =
            Pattern.compile("^https?://hirhanyo\\.hu/hirek/utinfo/[^/#?]+/?$", Pattern.CASE_INSENSITIVE);

    /* ------------------------------ PUBLIC API ------------------------------ */

    /** Totalcar – a /tesztek/ gyűjtőről szedi a legújabb teszteket (deduplikálva). */
    public List<NewsItem> fetchTotalcarTests(int limit) throws Exception {
        final String url = "https://totalcar.hu/tesztek/";
        Document doc = connect(url).get();

        // A totalcar oldalon többféle markup van, de a cikk-permalink mindig /teszt... vagy /tesztek...
        Elements a = new Elements();
        a.addAll(doc.select("article a[href]"));
        a.addAll(doc.select(".cards a[href]"));
        a.addAll(doc.select("main a[href]"));

        return collectFromAnchors(
                a, limit, "Totalcar",
                href -> P_TOTALCAR.matcher(href).matches(),
                this::pageTitleIfWeak,
                "https://totalcar.hu"
        );
    }

    /** Útinfó – 1) Hírhányó /utinfo/, 2) Utinform (hivatalos), 3) Google News fallback. */
    public List<NewsItem> fetchUtinform(int limit) throws Exception {
        try {
            List<NewsItem> hh = fetchUtinformFromHirhanyo(limit);
            if (!hh.isEmpty()) return hh;
        } catch (Exception ignored) {}

        try {
            List<NewsItem> off = fetchUtinformFromSite(limit);
            if (!off.isEmpty()) return off;
        } catch (Exception ignored) {}

        // Fallback – Google News (sabloncím javítással)
        List<NewsItem> rss = fetchGoogleNews("utinform.hu", "", limit, "Útinform");
        for (NewsItem n : rss) {
            if (GENERIC_UTINFORM.equalsIgnoreCase(n.getTitle()) || n.getTitle().length() < 8) {
                String better = pageTitle(n.getLink());
                if (!better.isBlank()) n.setTitle(better);
            }
        }
        return rss;
    }

    /* -------------------------- Forrás-specifikusak ------------------------- */

    /** Hírhányó /utinfo/ kategória – csak az ide tartozó permalinkek. */
    public List<NewsItem> fetchUtinformFromHirhanyo(int limit) throws Exception {
        final String url = "https://hirhanyo.hu/hirek/utinfo/";
        Document doc = connect(url).get();

        Elements a = new Elements();
        a.addAll(doc.select("main a[href]"));
        a.addAll(doc.select("article a[href]"));
        a.addAll(doc.select(".post a[href], .card a[href], .entry a[href], .list a[href]"));

        return collectFromAnchors(
                a, limit, "Útinfó – Hírhányó",
                href -> P_HH_UTINFO.matcher(href).matches(),
                this::pageTitleIfWeak,
                "https://hirhanyo.hu"
        );
    }

    /** Utinform hivatalos híroldal – cím + link. */
    public List<NewsItem> fetchUtinformFromSite(int limit) throws Exception {
        final String url = "https://www.utinform.hu/hu/news?d=0";
        Document doc = connect(url).get();

        // A listában a hír címek <a> elemek – abszolutizáljuk és szűrjük a használhatókat.
        Elements a = new Elements();
        a.addAll(doc.select("main a[href]"));
        a.addAll(doc.select(".news a[href], article a[href], li a[href]"));

        Predicate<String> filter = href -> {
            String abs = absUrl(href, "https://www.utinform.hu");
            try {
                URI u = new URI(abs);
                if (u.getHost() == null || !u.getHost().contains("utinform.hu")) return false;
                String path = Optional.ofNullable(u.getPath()).orElse("");
                // A részletek tipikusan /hu/news/.. vagy /hu/hirek/.. alatt vannak – legyünk megengedők
                return path.contains("/news") || path.contains("/hirek");
            } catch (URISyntaxException e) {
                return false;
            }
        };

        return collectFromAnchors(
                a, limit, "Útinform",
                filter,
                /* titleResolver */ null,
                "https://www.utinform.hu"
        );
    }

    /** Google News RSS (általános segéd). */
    public List<NewsItem> fetchGoogleNews(String site, String extraQuery, int limit, String sourceLabel) throws Exception {
        String q = "site:" + site + (extraQuery == null || extraQuery.isBlank() ? "" : " " + extraQuery);
        String encoded = java.net.URLEncoder.encode(q, StandardCharsets.UTF_8);
        String url = "https://news.google.com/rss/search?q=" + encoded + "&hl=hu&gl=HU&ceid=HU:hu";

        Document doc = connect(url).get();

        List<NewsItem> items = new ArrayList<>();
        for (Element item : doc.select("item")) {
            Element t = item.selectFirst("title");
            Element l = item.selectFirst("link");
            if (t == null || l == null) continue;

            String title = safe(t.text());
            String link  = canon(absUrl(l.text(), null));
            if (title.length() < 3 || !link.startsWith("http")) continue;

            if (items.stream().noneMatch(x -> x.getLink().equals(link))) {
                items.add(new NewsItem(title, link, sourceLabel, LocalDateTime.now()));
                if (items.size() >= limit) break;
            }
        }
        return items;
    }

    /* ------------------------------- Gyűjtő ------------------------------- */

    private List<NewsItem> collectFromAnchors(
            Elements anchors,
            int limit,
            String sourceLabel,
            Predicate<String> hrefFilter,
            Function<String,String> titleResolverIfWeak,
            String baseForRel
    ) {
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<NewsItem> out = new ArrayList<>();

        for (Element a : anchors) {
            String href = canon(absUrl(a.attr("href"), baseForRel));
            if (href.isBlank() || !hrefFilter.test(href)) continue;

            // Cím – ha gyenge, oldalcím lekérése
            String title = guessTitle(a);
            if (titleResolverIfWeak != null && (title.length() < 8 || GENERIC_UTINFORM.equalsIgnoreCase(title))) {
                String better = titleResolverIfWeak.apply(href);
                if (!better.isBlank()) title = better;
            }
            if (title.length() < 8) continue;

            if (seen.add(href)) {
                out.add(new NewsItem(title, href, sourceLabel, LocalDateTime.now()));
                if (out.size() >= limit) break;
            }
        }
        return out;
    }

    private String guessTitle(Element a) {
        String t = safe(a.hasAttr("title") ? a.attr("title") : a.text());
        if (t.length() >= 8) return t;
        Element block = a.closest("article, .post, .card, .entry, li, .list-item");
        if (block != null) {
            Element h = block.selectFirst("h1, h2, h3, .title, .entry-title, .card-title");
            if (h != null) t = safe(h.text());
        }
        return t;
    }

    /* --------------------------- Link/cím segédek --------------------------- */

    private String pageTitleIfWeak(String url) {
        try {
            String t = pageTitle(url);
            return t.length() >= 8 ? t : "";
        } catch (Exception e) {
            return "";
        }
    }

    private String pageTitle(String url) {
        try {
            Document d = connect(url).get();
            Element og = d.selectFirst("meta[property=og:title], meta[name=og:title]");
            if (og != null) {
                String v = safe(og.attr("content"));
                if (v.length() >= 8) return v;
            }
            return safe(d.title());
        } catch (Exception e) {
            return "";
        }
    }

    private Connection connect(String url) {
        return Jsoup.connect(url)
                .userAgent(UA)
                .referrer("https://www.google.com/")
                .timeout(TIMEOUT_MS)
                .ignoreHttpErrors(true)
                .ignoreContentType(true)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Cache-Control", "no-cache");
    }

    private static String safe(String s) {
        if (s == null) return "";
        return s.replace('\u00A0', ' ').trim();
    }

    /** Relatív → abszolút. */
    private static String absUrl(String href, String base) {
        if (href == null) return "";
        href = href.trim();
        if (href.isEmpty()) return "";
        try {
            URI u = new URI(href);
            if (u.isAbsolute()) return href;
        } catch (URISyntaxException ignored) {}
        if (base == null || base.isBlank()) return href;
        try {
            return new URI(base).resolve(href).toString();
        } catch (Exception e) {
            return href;
        }
    }

    /** Kánon URL: utm/kampány paramok le, duplázódás megszüntetése. */
    private static String canon(String url) {
        try {
            URI u = new URI(url);
            String q = u.getQuery();
            // dobjuk az UTM / fbclid / gclid stb. zajt
            Map<String, String> keep = new LinkedHashMap<>();
            if (q != null) {
                for (String p : q.split("&")) {
                    int i = p.indexOf('=');
                    String k = (i >= 0 ? p.substring(0, i) : p).toLowerCase(Locale.ROOT);
                    if (k.startsWith("utm_") || k.equals("fbclid") || k.equals("gclid")) continue;
                    keep.put(p, "");
                }
            }
            String newQ = keep.isEmpty() ? null : String.join("&", keep.keySet());
            URI clean = new URI(u.getScheme(), u.getAuthority(), u.getPath(), newQ, null);
            String s = clean.toString();
            // trailing slash normalizálás
            if (s.endsWith("/")) s = s.substring(0, s.length() - 1);
            return s;
        } catch (Exception e) {
            return url;
        }
    }
}
