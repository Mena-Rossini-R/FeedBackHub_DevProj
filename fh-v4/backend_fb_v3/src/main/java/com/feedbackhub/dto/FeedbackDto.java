package com.feedbackhub.dto;

import com.feedbackhub.enums.AlertLevel;

import java.time.LocalDateTime;

/**
 * FeedbackDto — data transfer objects for the Feedback Thread API.
 *
 * Workflow position: Used by FeedbackController for feedback message payloads.
 *  - Request: message text + scoreId (sender identified from JWT token)
 *  - Response: full message record including senderRole and read flags
 */
public class FeedbackDto {

    public static class Request {
        private Long   scoreId;
        private String message;
        public Request() {}
        public Long   getScoreId() { return scoreId; }
        public String getMessage() { return message; }
        public void setScoreId(Long scoreId)   { this.scoreId = scoreId; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class Response {
        private Long          id;
        private Long          scoreId;
        private String        assignmentName;
        private String        senderName;
        private String        senderRole;
        private String        message;
        private boolean       readByTrainee;
        private boolean       readByTrainer;
        private LocalDateTime createdAt;
        public Response() {}
        public Long          getId()              { return id; }
        public Long          getScoreId()         { return scoreId; }
        public String        getAssignmentName()  { return assignmentName; }
        public String        getSenderName()      { return senderName; }
        public String        getSenderRole()      { return senderRole; }
        public String        getMessage()         { return message; }
        public boolean       isReadByTrainee()    { return readByTrainee; }
        public boolean       isReadByTrainer()    { return readByTrainer; }
        public LocalDateTime getCreatedAt()       { return createdAt; }
        public void setId(Long id)                              { this.id              = id; }
        public void setScoreId(Long scoreId)                    { this.scoreId         = scoreId; }
        public void setAssignmentName(String assignmentName)    { this.assignmentName  = assignmentName; }
        public void setSenderName(String senderName)            { this.senderName      = senderName; }
        public void setSenderRole(String senderRole)            { this.senderRole      = senderRole; }
        public void setMessage(String message)                  { this.message         = message; }
        public void setReadByTrainee(boolean readByTrainee)     { this.readByTrainee   = readByTrainee; }
        public void setReadByTrainer(boolean readByTrainer)     { this.readByTrainer   = readByTrainer; }
        public void setCreatedAt(LocalDateTime createdAt)       { this.createdAt       = createdAt; }
    }
}
