package enset.embedding3x.tpservice.service;

import enset.embedding3x.tpservice.entity.Progress;
import enset.embedding3x.tpservice.repository.ProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private final ProgressRepository progressRepository;

    public Optional<Progress> findByStudentAndTp(String studentId, String tpId) {
        return progressRepository.findByStudentIdAndTpId(studentId, tpId);
    }

    public List<Progress> findByStudent(String studentId) {
        return progressRepository.findByStudentId(studentId);
    }

    public List<Progress> findByTp(String tpId) {
        return progressRepository.findByTpId(tpId);
    }

    public Progress upsert(String studentId, String tpId, Map<String, Object> data) {
        Progress progress = progressRepository.findByStudentIdAndTpId(studentId, tpId)
                .orElse(Progress.builder()
                        .id(java.util.UUID.randomUUID().toString())
                        .studentId(studentId)
                        .tpId(tpId)
                        .build());

        applyUpdates(progress, data);
        progress.setLastActiveAt(LocalDateTime.now());
        return progressRepository.save(progress);
    }

    @SuppressWarnings("unchecked")
    private void applyUpdates(Progress progress, Map<String, Object> data) {
        if (data.containsKey("assignmentId"))
            progress.setAssignmentId((String) data.get("assignmentId"));

        if (data.containsKey("currentStepIndex"))
            progress.setCurrentStepIndex(((Number) data.get("currentStepIndex")).intValue());

        if (data.containsKey("steps"))
            progress.setSteps((List<Map<String, Object>>) data.get("steps"));

        if (data.containsKey("quizAnswers"))
            progress.setQuizAnswers((Map<String, Object>) data.get("quizAnswers"));

        if (data.containsKey("quizScore"))
            progress.setQuizScore(((Number) data.get("quizScore")).intValue());

        if (data.containsKey("totalTimeSeconds"))
            progress.setTotalTimeSeconds(((Number) data.get("totalTimeSeconds")).longValue());

        if (data.containsKey("status")) {
            String newStatus = (String) data.get("status");
            progress.setStatus(newStatus);
            if ("in_progress".equals(newStatus) && progress.getStartedAt() == null)
                progress.setStartedAt(LocalDateTime.now());
            if ("completed".equals(newStatus) && progress.getCompletedAt() == null)
                progress.setCompletedAt(LocalDateTime.now());
        }
    }
}
