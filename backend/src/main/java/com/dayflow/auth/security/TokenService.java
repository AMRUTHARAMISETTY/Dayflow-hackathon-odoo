package com.dayflow.auth.security;

import com.dayflow.auth.config.DayflowProperties;
import com.dayflow.auth.model.AuthModels.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
  private final JwtEncoder encoder; private final DayflowProperties props; private final SecureRandom random = new SecureRandom();
  public TokenService(JwtEncoder encoder, DayflowProperties props) { this.encoder=encoder; this.props=props; }
  public String access(User user) {
    var now=Instant.now(); var claims=JwtClaimsSet.builder().issuer("dayflow").issuedAt(now)
      .expiresAt(now.plus(props.accessTokenMinutes(), ChronoUnit.MINUTES)).subject(user.id().toString())
      .claim("roles",user.roles()).claim("email",user.email()).claim("name",user.displayName()).build();
    return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
  }
  public String opaque() { byte[] bytes=new byte[48]; random.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
  public String hash(String value) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
    catch (Exception e) { throw new IllegalStateException(e); }
  }
  public static SecretKeySpec key(String secret) { return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"); }
}
