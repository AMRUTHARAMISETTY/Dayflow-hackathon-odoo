package com.dayflow.auth.config;

import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BootstrapAdmin implements ApplicationRunner {
  private final JdbcClient db; private final DayflowProperties props;
  public BootstrapAdmin(JdbcClient db,DayflowProperties props){this.db=db;this.props=props;}
  @Override public void run(ApplicationArguments args){var c=props.bootstrapAdmin();if(c==null||c.email()==null||c.email().isBlank()||c.password()==null||c.password().isBlank())return;Long count=db.sql("SELECT count(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='ADMIN_HR'").query(Long.class).single();if(count>0)return;UUID id=db.sql("INSERT INTO users(email,display_name,password_hash,status,email_verified,activated_at) VALUES(:e,'Bootstrap Administrator',:p,'ACTIVE',true,now()) RETURNING id").param("e",c.email().toLowerCase()).param("p",new BCryptPasswordEncoder(12).encode(c.password())).query(UUID.class).single();db.sql("INSERT INTO user_roles(user_id,role_id) SELECT :u,id FROM roles WHERE code='ADMIN_HR'").param("u",id).update();}
}
