package com.neetlu.examhunt.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({AppProperties.class, PublicApiCacheProperties.class})
public class AppConfig {}
