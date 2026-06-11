package enset.embedding3x.tpservice.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import enset.embedding3x.tpservice.entity.Assignment;
import enset.embedding3x.tpservice.entity.TP;
import enset.embedding3x.tpservice.repository.AssignmentRepository;
import enset.embedding3x.tpservice.repository.TPRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Seeds the demo TPs and assignments so the dashboards are populated out of the box.
 *
 * IDs are pinned to the values previously hard-coded in the frontend mock data
 * (frontend/data/mockIds.ts), and reference the same student/teacher UUIDs seeded
 * by the auth-service, so the whole demo stays internally consistent.
 *
 * Idempotent: only runs when the tps table is empty.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TpDataSeeder implements CommandLineRunner {

    private final TPRepository tpRepository;
    private final AssignmentRepository assignmentRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    @SuppressWarnings("unchecked")
    public void run(String... args) throws Exception {
        if (tpRepository.count() > 0) {
            log.info("TpDataSeeder: TPs already present, skipping seed");
            return;
        }

        List<Map<String, Object>> tps = readSeed("seed/tps.json");
        for (Map<String, Object> m : tps) {
            tpRepository.save(TP.builder()
                    .id((String) m.get("id"))
                    .title((String) m.get("title"))
                    .description((String) m.getOrDefault("description", ""))
                    .difficulty((String) m.getOrDefault("difficulty", "beginner"))
                    .field((String) m.getOrDefault("field", "Général"))
                    .estimatedMinutes(((Number) m.getOrDefault("estimatedMinutes", 30)).intValue())
                    .starterHTML((String) m.getOrDefault("starterHTML", ""))
                    .steps((List<Map<String, Object>>) m.getOrDefault("steps", List.of()))
                    .createdBy((String) m.get("createdBy"))
                    .build());
        }

        List<Map<String, Object>> assignments = readSeed("seed/assignments.json");
        for (Map<String, Object> m : assignments) {
            assignmentRepository.save(Assignment.builder()
                    .id((String) m.get("id"))
                    .tpId((String) m.get("tpId"))
                    .studentIds((List<String>) m.getOrDefault("studentIds", List.of()))
                    .assignedBy((String) m.get("assignedBy"))
                    .dueDate(parseDate((String) m.get("dueDate")))
                    .build());
        }

        log.info("TpDataSeeder: seeded {} TP(s) and {} assignment(s)", tps.size(), assignments.size());
    }

    private List<Map<String, Object>> readSeed(String path) throws Exception {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return mapper.readValue(in, new TypeReference<>() {});
        }
    }

    private LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.endsWith("Z") ? value.substring(0, value.length() - 1) : value;
        try {
            return LocalDateTime.parse(v);
        } catch (Exception e) {
            try {
                return LocalDate.parse(v).atStartOfDay();
            } catch (Exception ignored) {
                return null;
            }
        }
    }
}
