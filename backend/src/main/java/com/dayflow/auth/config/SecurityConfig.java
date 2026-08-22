package com.dayflow.auth.config;

import com.dayflow.auth.security.TokenService;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.SecretKey;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.webauthn.management.JdbcPublicKeyCredentialUserEntityRepository;
import org.springframework.security.web.webauthn.management.JdbcUserCredentialRepository;
import org.springframework.security.web.webauthn.authentication.WebAuthnAuthenticationFilter;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.security.config.ObjectPostProcessor;
import org.springframework.security.core.userdetails.*;
import com.dayflow.auth.repo.AuthRepository;
import com.dayflow.auth.security.PasskeySuccessHandler;
import org.springframework.web.cors.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
  @Bean SecretKey jwtKey(DayflowProperties p) {
    if (p.jwtSecret()==null || p.jwtSecret().getBytes(StandardCharsets.UTF_8).length<32) throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
    return TokenService.key(p.jwtSecret());
  }
  @Bean JwtEncoder jwtEncoder(SecretKey key) { return new NimbusJwtEncoder(new ImmutableSecret<>(key)); }
  @Bean JwtDecoder jwtDecoder(SecretKey key) { return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).build(); }
  @Bean SecurityFilterChain security(HttpSecurity http, JwtDecoder decoder, DayflowProperties p,PasskeySuccessHandler passkeySuccess) throws Exception {
    var authorities=new JwtGrantedAuthoritiesConverter(); authorities.setAuthoritiesClaimName("roles"); authorities.setAuthorityPrefix("ROLE_");
    var converter=new JwtAuthenticationConverter(); converter.setJwtGrantedAuthoritiesConverter(authorities);
    var csrf=CookieCsrfTokenRepository.withHttpOnlyFalse(); csrf.setCookieCustomizer(c->c.sameSite("Strict").secure(p.cookieSecure()));
    return http.cors(Customizer.withDefaults()).csrf(c->c.csrfTokenRepository(csrf).ignoringRequestMatchers("/api/auth/login","/api/auth/refresh","/api/auth/password/forgot","/api/auth/password/reset","/api/auth/email/**","/api/auth/employee/activate/**","/api/auth/passkeys/login/**"))
      .webAuthn(w->{w.rpId(p.webauthn().rpId()).rpName(p.webauthn().rpName()).allowedOrigins(p.webauthn().allowedOrigin());w.addObjectPostProcessor(new ObjectPostProcessor<WebAuthnAuthenticationFilter>(){public <O extends WebAuthnAuthenticationFilter> O postProcess(O filter){filter.setAuthenticationSuccessHandler(passkeySuccess);return filter;}});})
      .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a->a.requestMatchers("/actuator/health","/docs/**","/v3/api-docs/**","/api/auth/csrf").permitAll()
        .requestMatchers(HttpMethod.POST,"/api/auth/login","/api/auth/refresh","/api/auth/password/**","/api/auth/email/**","/api/auth/employee/activate/**","/api/auth/passkeys/login/**").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN_HR").anyRequest().authenticated())
      .oauth2ResourceServer(o->o.jwt(j->j.decoder(decoder).jwtAuthenticationConverter(converter)))
      .headers(h->h.contentSecurityPolicy(c->c.policyDirectives("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")))
      .build();
  }
  @Bean CorsConfigurationSource cors(DayflowProperties p) {
    var c=new CorsConfiguration(); c.setAllowedOrigins(List.of(p.appOrigin())); c.setAllowedMethods(List.of("GET","POST","PATCH","DELETE","OPTIONS")); c.setAllowedHeaders(List.of("Authorization","Content-Type","X-XSRF-TOKEN")); c.setAllowCredentials(true); c.setMaxAge(3600L);
    var source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",c); return source;
  }
  @Bean JdbcPublicKeyCredentialUserEntityRepository webauthnUsers(JdbcOperations jdbc){return new JdbcPublicKeyCredentialUserEntityRepository(jdbc);}
  @Bean JdbcUserCredentialRepository webauthnCredentials(JdbcOperations jdbc){return new JdbcUserCredentialRepository(jdbc);}
  @Bean UserDetailsService userDetails(AuthRepository users){return username->{var u=users.findUser(username).orElseThrow(()->new UsernameNotFoundException("Account unavailable"));return User.withUsername(u.email()).password(u.passwordHash()==null?"{noop}unavailable":u.passwordHash()).roles(u.roles().toArray(String[]::new)).disabled(!"ACTIVE".equals(u.status())).build();};}
}
