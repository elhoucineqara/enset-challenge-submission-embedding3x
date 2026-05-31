package enset.embedding3x.tpservice.entity;

import enset.embedding3x.tpservice.converter.JsonConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "tps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TP {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String difficulty;

    private Integer estimatedMinutes;

    @Column(columnDefinition = "TEXT")
    private String starterHTML;

    /**
     * JSON array of step objects matching frontend TPStep type:
     * [{id, title, instructions, requiredTags: string[], quiz: QuizQuestion[]}]
     */
    @Convert(converter = JsonConverter.MapListConverter.class)
    @Column(name = "steps_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<Map<String, Object>> steps = new ArrayList<>();

    @Column(nullable = false)
    private String createdBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
