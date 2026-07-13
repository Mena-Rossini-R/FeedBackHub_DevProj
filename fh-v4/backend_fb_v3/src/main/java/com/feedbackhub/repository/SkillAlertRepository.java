package com.feedbackhub.repository;
import com.feedbackhub.entity.SkillAlert;
import com.feedbackhub.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

/**
 * SkillAlertRepository — JPA data access for SkillAlert entities.
 *
 * Workflow position: Used by SkillAlertService to find, create, and update alerts.
 * Custom queries: find alerts by trainee (ordered by date), find unresolved alerts.
 */
public interface SkillAlertRepository extends JpaRepository<SkillAlert, Long> {

    @Query("SELECT a FROM SkillAlert a WHERE a.trainee = :trainee ORDER BY a.createdAt DESC")
    List<SkillAlert> findByTraineeOrderByCreatedAtDesc(@Param("trainee") User trainee);

    @Query("SELECT a FROM SkillAlert a WHERE a.trainee = :trainee AND a.acknowledged = false ORDER BY a.createdAt DESC")
    List<SkillAlert> findByTraineeAndAcknowledgedFalseOrderByCreatedAtDesc(@Param("trainee") User trainee);

    @Query("SELECT COUNT(a) FROM SkillAlert a WHERE a.trainee = :trainee AND a.acknowledged = false")
    long countByTraineeAndAcknowledgedFalse(@Param("trainee") User trainee);

    @Query("SELECT COUNT(a) FROM SkillAlert a WHERE a.trainee = :trainee AND a.resolved = true")
    long countByTraineeAndResolvedTrue(@Param("trainee") User trainee);
}
