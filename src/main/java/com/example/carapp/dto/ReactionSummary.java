// com/example/carapp/dto/ReactionSummary.java
package com.example.carapp.dto;

import com.example.carapp.model.ReactionType;
import java.util.Map;

public class ReactionSummary {
    private Long postId;
    private Map<ReactionType, Long> counts;
    private ReactionType myReaction;

    public Long getPostId() { return postId; }
    public void setPostId(Long postId) { this.postId = postId; }
    public Map<ReactionType, Long> getCounts() { return counts; }
    public void setCounts(Map<ReactionType, Long> counts) { this.counts = counts; }
    public ReactionType getMyReaction() { return myReaction; }
    public void setMyReaction(ReactionType myReaction) { this.myReaction = myReaction; }
}
