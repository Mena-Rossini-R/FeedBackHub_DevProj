package com.feedbackhub.controller;

import com.feedbackhub.dto.FeedbackDto;
import com.feedbackhub.entity.User;
import com.feedbackhub.repository.UserRepository;
import com.feedbackhub.service.FeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * FeedbackController — manages the feedback thread between trainer and trainee.
 *
 * Workflow:
 *  - A score has a "feedback thread" (like a chat) attached to it.
 *  - Both trainer and trainee can post messages to the same thread.
 *  - When a thread is opened, messages are automatically marked as read
 *    for the viewer (trainer or trainee).
 *  - Unread counts are polled every 30 seconds by the layout component
 *    to show the badge on the sidebar navigation icon.
 */
@RestController
@RequestMapping("/feedback")
public class FeedbackController {

    @Autowired private FeedbackService feedbackService;
    @Autowired private UserRepository  userRepo;

    /** Add a message to a score's feedback thread. */
    @PostMapping
    public ResponseEntity<FeedbackDto.Response> addMessage(@RequestBody FeedbackDto.Request req,
                                                            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(feedbackService.addMessage(req, ud.getUsername()));
    }

    /** Fetch the full message thread for a score and mark it as read for the current user. */
    @GetMapping("/score/{scoreId}")
    public ResponseEntity<List<FeedbackDto.Response>> getThread(@PathVariable Long scoreId,
                                                                  @AuthenticationPrincipal UserDetails ud) {
        User user = userRepo.findByEmail(ud.getUsername()).orElse(null);
        if (user != null && "TRAINER".equals(user.getRole().name())) {
            feedbackService.markReadByTrainer(scoreId);
        } else {
            feedbackService.markReadByTrainee(scoreId, ud.getUsername());
        }
        return ResponseEntity.ok(feedbackService.getThread(scoreId));
    }

    /** Returns a map of scoreId → unread count for the trainer (used for sidebar badge). */
    @GetMapping("/unread-counts")
    public ResponseEntity<Map<Long, Long>> getUnreadCountsTrainer(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(feedbackService.getUnreadCountsForTrainer(ud.getUsername()));
    }

    /** Returns a map of scoreId → unread count for the trainee (used for sidebar badge). */
    @GetMapping("/unread-trainee-counts")
    public ResponseEntity<Map<Long, Long>> getUnreadCountsTrainee(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(feedbackService.getUnreadCountsForTrainee(ud.getUsername()));
    }
}