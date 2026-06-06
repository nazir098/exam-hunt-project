package com.neetlu.examhunt;

import com.neetlu.examhunt.config.RootEnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ExamHuntApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(ExamHuntApplication.class);
        app.setDefaultProperties(RootEnvLoader.loadDefaults());
        app.run(args);
    }
}
