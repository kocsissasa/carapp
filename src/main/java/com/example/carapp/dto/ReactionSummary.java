// com/example/carapp/dto/ReactionSummary.java
package com.example.carapp.dto;

import com.example.carapp.model.ReactionType;
import java.util.Map;

public class ReactionSummary { // -> Egy poszthoz tartozó reakciók összegzése + a bejelentkezett user saját reakciója
    private Long postId; // -> Melyik poszt azonosítójáról szól az összesítés
    private Map<ReactionType, Long> counts; // -> Összesítés:
    private ReactionType myReaction; // -> A bejelentkezett felhasználó saját reakciója

    public Long getPostId() { return postId; }
    public void setPostId(Long postId) { this.postId = postId; }
    public Map<ReactionType, Long> getCounts() { return counts; }
    public void setCounts(Map<ReactionType, Long> counts) { this.counts = counts; }
    public ReactionType getMyReaction() { return myReaction; }
    public void setMyReaction(ReactionType myReaction) { this.myReaction = myReaction; }
}
