package enset.embedding3x.tpservice.repository;

import enset.embedding3x.tpservice.entity.Progress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProgressRepository extends JpaRepository<Progress, String> {
    List<Progress> findByStudentId(String studentId);
    List<Progress> findByTpId(String tpId);
    Optional<Progress> findByStudentIdAndTpId(String studentId, String tpId);
    List<Progress> findByAssignmentId(String assignmentId);
}
