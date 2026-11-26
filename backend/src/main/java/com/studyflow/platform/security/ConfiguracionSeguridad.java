package com.studyflow.platform.security;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class ConfiguracionSeguridad {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecurityFilterChain seguridad(HttpSecurity http, TokensSesion tokens) throws Exception {
        return http
                .sessionManagement(config -> config.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                // La API usa Bearer. Las únicas operaciones con cookie exigen
                // el encabezado propio de Angular y usan SameSite=Strict.
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin())
                        .contentSecurityPolicy(csp -> csp.policyDirectives("frame-ancestors 'self'; object-src 'none'; base-uri 'self'")))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, error) -> {
                            if (!esRutaApi(request)) {
                                problema(response, 404, "Ruta no encontrada.");
                                return;
                            }
                            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
                            problema(response, 401, "Inicia sesión para continuar.");
                        })
                        .accessDeniedHandler((request, response, error) ->
                                problema(response, 403, "No tienes permiso para realizar esta operación.")))
                .authorizeHttpRequests(authorization -> authorization
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers("/api/admin", "/api/admin/**").denyAll()
                        .requestMatchers(HttpMethod.POST, "/api/sesion/acceder", "/api/sesion/entrar",
                                "/api/sesion/renovar", "/api/sesion/salir",
                                "/api/usuarios/registro", "/api/usuarios/acceso").permitAll()
                        .requestMatchers("/api", "/api/**").hasAnyRole("ESTUDIANTE", "DEMO")
                        .anyRequest().denyAll())
                .addFilterBefore(new BearerFilter(tokens), AnonymousAuthenticationFilter.class)
                .build();
    }

    private static boolean esRutaApi(HttpServletRequest request) {
        String ruta = request.getRequestURI().substring(request.getContextPath().length());
        return ruta.equals("/api") || ruta.startsWith("/api/");
    }

    private static void problema(HttpServletResponse response, int estado, String mensaje) throws IOException {
        response.setStatus(estado);
        response.setContentType("application/problem+json;charset=UTF-8");
        response.getWriter().write("{\"status\":" + estado + ",\"detail\":\"" + mensaje + "\"}");
    }

    private static final class BearerFilter extends OncePerRequestFilter {
        private final TokensSesion tokens;

        private BearerFilter(TokensSesion tokens) {
            this.tokens = tokens;
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            return !esRutaApi(request);
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                        FilterChain chain) throws ServletException, IOException {
            String autorizacion = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (autorizacion != null && autorizacion.regionMatches(true, 0, "Bearer ", 0, 7)) {
                tokens.verificar(autorizacion.substring(7)).ifPresent(identidad -> {
                    var rol = new SimpleGrantedAuthority(identidad.demostracion() ? "ROLE_DEMO" : "ROLE_ESTUDIANTE");
                    var autenticacion = UsernamePasswordAuthenticationToken.authenticated(identidad, null, List.of(rol));
                    var contexto = SecurityContextHolder.createEmptyContext();
                    contexto.setAuthentication(autenticacion);
                    SecurityContextHolder.setContext(contexto);
                });
            }
            chain.doFilter(request, response);
        }
    }
}
