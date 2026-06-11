package enset.embedding3x.tpservice.service;

import enset.embedding3x.tpservice.entity.Assignment;
import enset.embedding3x.tpservice.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;

    public List<Assignment> findByTeacher(String teacherId) {
        return assignmentRepository.findByAssignedBy(teacherId);
    }

    public List<Assignment> findByStudent(String studentId) {
        return assignmentRepository.findByStudentIdContaining(studentId)
                .stream()
                .filter(a -> a.getStudentIds().contains(studentId))
                .toList();
    }

    public List<Assignment> findByTp(String tpId) {
        return assignmentRepository.findByTpId(tpId);
    }

    public Assignment findById(String id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + id));
    }

    @SuppressWarnings("unchecked")
    public Assignment create(Map<String, Object> data, String assignedBy) {
        List<String> studentIds = (List<String>) data.getOrDefault("studentIds", List.of());
        String dueDateStr = (String) data.get("dueDate");

        Assignment assignment = Assignment.builder()
                .id(data.get("id") != null ? (String) data.get("id") : java.util.UUID.randomUUID().toString())
                .tpId((String) data.get("tpId"))
                .studentIds(studentIds)
                .assignedBy(assignedBy)
                .dueDate(parseDate(dueDateStr))
                .build();

        return assignmentRepository.save(assignment);
    }

    /** Tolerant date parsing: accepts ISO datetime (optionally with trailing Z) or a plain date. */
    private LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.endsWith("Z") ? value.substring(0, value.length() - 1) : value;
        try {
            return LocalDateTime.parse(v);
        } catch (Exception e) {
            try {
                return java.time.LocalDate.parse(v).atStartOfDay();
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    public void delete(String id, String requestingUserId) {
        Assignment a = findById(id);
        if (!a.getAssignedBy().equals(requestingUserId)) {
            throw new SecurityException("Not authorized to delete this assignment");
        }
        assignmentRepository.deleteById(id);
    }
}
