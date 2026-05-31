package enset.embedding3x.tpservice.repository;

import enset.embedding3x.tpservice.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, String> {
    List<Assignment> findByAssignedBy(String assignedBy);
    List<Assignment> findByTpId(String tpId);

    @Query("SELECT a FROM Assignment a WHERE a.studentIds LIKE %:studentId%")
    List<Assignment> findByStudentIdContaining(@Param("studentId") String studentId);
}
