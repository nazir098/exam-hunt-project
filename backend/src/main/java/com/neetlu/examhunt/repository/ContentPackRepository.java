package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.ContentPack;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ContentPackRepository extends MongoRepository<ContentPack, String> {

    Optional<ContentPack> findByPackId(String packId);

    List<ContentPack> findAllByPackId(String packId);

    List<ContentPack> findAllByOrderByYearDesc();

    List<ContentPack> findByExamIgnoreCaseOrderByYearDesc(String exam);

    void deleteByPackId(String packId);
}
