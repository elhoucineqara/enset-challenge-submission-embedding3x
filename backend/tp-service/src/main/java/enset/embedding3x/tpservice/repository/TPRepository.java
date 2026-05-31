package enset.embedding3x.tpservice.repository;

import enset.embedding3x.tpservice.entity.TP;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TPRepository extends JpaRepository<TP, String> {
    List<TP> findByCreatedBy(String createdBy);
    List<TP> findByCreatedByOrderByCreatedAtDesc(String createdBy);
}
