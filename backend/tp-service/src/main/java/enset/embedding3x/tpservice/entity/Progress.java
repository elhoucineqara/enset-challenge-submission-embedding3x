package enset.embedding3x.tpservice.entity;

import enset.embedding3x.tpservice.converter.JsonConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "progress",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "tp_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Progress {

    @Id
    private String id;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "tp_id", nullable = false)
    private String tpId;

    private String assignmentId;

    @Builder.Default
    private Integer currentStepIndex = 0;

    /**
     * JSON array of step progress objects matching frontend StepProgress type:
     * [{stepId, code, timeSpentSeconds, hintsUsed, validationErrors, completed, completedAt}]
     */
    @Convert(converter = JsonConverter.MapListConverter.class)
    @Column(name = "steps_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<Map<String, Object>> steps = new ArrayList<>();

    /**
     * JSON map of quizAnswers: {questionId -> selectedOptionId}
     */
    @Convert(converter = JsonConverter.MapConverter.class)
    @Column(name = "quiz_answers_json", columnDefinition = "TEXT")
    @Builder.Default
    private Map<String, Object> quizAnswers = new HashMap<>();

    private Integer quizScore;

    @Builder.Default
    private Long totalTimeSeconds = 0L;

    @Builder.Default
    private String status = "not_started"; // not_started | in_progress | completed

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime lastActiveAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
