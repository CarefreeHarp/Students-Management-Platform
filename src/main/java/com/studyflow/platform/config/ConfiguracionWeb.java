package com.studyflow.platform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Ajustes de la capa Interfaz: recursos estáticos y CORS de la API. */
@Configuration
public class ConfiguracionWeb implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCachePeriod(3600);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Desarrollo local y dominio público de Railway.
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                        "http://localhost:*",
                        "https://students-management-platform-production.up.railway.app")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE");
    }
}
