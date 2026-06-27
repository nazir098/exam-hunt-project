package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.model.UserRole;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends MongoRepository<UserAccount, String> {
    Optional<UserAccount> findByEmailIgnoreCase(String email);

    Optional<UserAccount> findByGoogleSub(String googleSub);
    boolean existsByEmailIgnoreCase(String email);
    List<UserAccount> findByEmailStartingWithIgnoreCase(String prefix);

    List<UserAccount> findByRole(UserRole role);
}
