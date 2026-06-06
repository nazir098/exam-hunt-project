package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.PlatformSettings;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlatformSettingsRepository extends MongoRepository<PlatformSettings, String> {}
