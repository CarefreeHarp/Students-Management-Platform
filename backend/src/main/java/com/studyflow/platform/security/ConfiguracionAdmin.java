package com.studyflow.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.InetAddress;
import java.util.Locale;
import java.util.Set;

@Configuration
@ConditionalOnProperty(name = "studyflow.admin.enabled", havingValue = "true")
public class ConfiguracionAdmin {
    private static final String ADMIN = "/api/admin";
    private static final Set<String> HOSTS_LOCALES = Set.of("localhost", "127.0.0.1", "[::1]", "::1");

    @Bean
    @Order(1)
    SecurityFilterChain seguridadAdmin(HttpSecurity http, PasswordEncoder encoder) throws Exception {
        var usuario = User.withUsername("admin").password(encoder.encode("admin")).roles("ADMIN").build();
        var proveedor = new DaoAuthenticationProvider(new InMemoryUserDetailsManager(usuario));
        proveedor.setPasswordEncoder(encoder);

        return http.securityMatcher(ADMIN, ADMIN + "/**")
                .authenticationManager(new ProviderManager(proveedor))
                .addFilterBefore(new AccesoLocal(), CsrfFilter.class)
                .requestCache(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, ADMIN + "/estado").permitAll()
                        .requestMatchers(HttpMethod.POST, ADMIN + "/acceder").anonymous()
                        .anyRequest().hasRole("ADMIN"))
                .exceptionHandling(errors -> errors.authenticationEntryPoint(
                        (request, response, error) -> response.setStatus(401)))
                .formLogin(login -> login.loginPage(ADMIN + "/acceder").loginProcessingUrl(ADMIN + "/acceder")
                        .successHandler((request, response, authentication) -> {
                            request.getSession().setMaxInactiveInterval(900);
                            response.setStatus(204);
                        })
                        .failureHandler((request, response, error) -> response.setStatus(401)))
                .logout(logout -> logout.logoutUrl(ADMIN + "/salir")
                        .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
                .build();
    }

    private static final class AccesoLocal extends OncePerRequestFilter {
        private final SolicitudesAutenticacion intentos = new SolicitudesAutenticacion();

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            String servidor = request.getServerName().toLowerCase(Locale.ROOT);
            String origen = request.getHeader("Sec-Fetch-Site");
            if (!HOSTS_LOCALES.contains(servidor)
                    || !InetAddress.getByName(request.getLocalAddr()).isLoopbackAddress()
                    || !InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()
                    || "cross-site".equals(origen) || "same-site".equals(origen)) {
                response.setStatus(404);
                return;
            }

            if ("POST".equals(request.getMethod()) && (ADMIN + "/acceder").equals(request.getServletPath())) {
                try {
                    intentos.limitar(request, "admin");
                } catch (ResponseStatusException limite) {
                    response.setStatus(limite.getStatusCode().value());
                    return;
                }
            }
            chain.doFilter(request, response);
        }
    }
}
