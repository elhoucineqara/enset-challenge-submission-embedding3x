package enset.embedding3x.tpservice.entity;

import enset.embedding3x.tpservice.converter.JsonConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Assignment {

    @Id
    private String id;

    @Column(nullable = false)
    private String tpId;

    @Convert(converter = JsonConverter.StringListConverter.class)
    @Column(name = "student_ids_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> studentIds = new ArrayList<>();

    @Column(nullable = false)
    private String assignedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime assignedAt;

    private LocalDateTime dueDate;
}
