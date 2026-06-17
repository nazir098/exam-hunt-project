package com.neetlu.examhunt.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.actuate.info.Info;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.LinkedHashMap;
import java.util.Map;

@Configuration
public class DeploymentInfo {

    private static final Logger log = LoggerFactory.getLogger(DeploymentInfo.class);

    @Bean
    ApplicationRunner deploymentInfoLogger(Environment env) {
        return args -> {
            Map<String, String> info = deploymentInfo(env);
            log.info(
                    "DEPLOYMENT_INFO imageTag={} commit={} ref={} buildTime={} runNumber={} profile={} port={}",
                    info.get("imageTag"),
                    info.get("commit"),
                    info.get("ref"),
                    info.get("buildTime"),
                    info.get("runNumber"),
                    String.join(",", env.getActiveProfiles()),
                    env.getProperty("server.port", "8081"));
        };
    }

    @Bean
    InfoContributor deploymentInfoContributor(Environment env) {
        return (Info.Builder builder) -> builder.withDetail("deployment", deploymentInfo(env));
    }

    private static Map<String, String> deploymentInfo(Environment env) {
        Map<String, String> info = new LinkedHashMap<>();
        info.put("imageTag", env.getProperty("IMAGE_TAG", "local"));
        info.put("commit", env.getProperty("BUILD_COMMIT", "local"));
        info.put("ref", env.getProperty("BUILD_REF", "local"));
        info.put("buildTime", env.getProperty("BUILD_TIME", "unknown"));
        info.put("runNumber", env.getProperty("BUILD_RUN_NUMBER", "local"));
        return info;
    }
}
