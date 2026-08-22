package com.dayflow.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import com.dayflow.auth.config.DayflowProperties;
import org.junit.jupiter.api.Test;

class TokenServiceTest {
  private final TokenService service=new TokenService(parameters->{throw new UnsupportedOperationException();},new DayflowProperties("http://localhost:5173","example.com","12345678901234567890123456789012",10,30,false,"security@example.com",new DayflowProperties.Webauthn("localhost","Dayflow","http://localhost:5173"),new DayflowProperties.BootstrapAdmin("","")));
  @Test void opaqueRefreshTokensAreRandomAndLong(){String first=service.opaque(),second=service.opaque();assertThat(first).hasSizeGreaterThan(50).isNotEqualTo(second);}
  @Test void hashesAreDeterministicAndDoNotExposeToken(){String raw="secret-refresh-token";assertThat(service.hash(raw)).isEqualTo(service.hash(raw)).doesNotContain(raw);}
}
