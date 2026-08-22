package com.dayflow.auth.service;

import com.dayflow.auth.config.DayflowProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {
  private final JavaMailSender sender; private final DayflowProperties props;
  public MailService(JavaMailSender sender, DayflowProperties props) { this.sender=sender; this.props=props; }
  public void otp(String to, String code, String purpose) {
    var message=new SimpleMailMessage(); message.setFrom(props.mailFrom()); message.setTo(to); message.setSubject("Dayflow security code");
    message.setText("Your Dayflow code is "+code+". It expires in 10 minutes. If you did not request this, contact your administrator. Purpose: "+purpose);
    sender.send(message);
  }
  public void passwordChanged(String to) {
    var m=new SimpleMailMessage(); m.setFrom(props.mailFrom()); m.setTo(to); m.setSubject("Your Dayflow password changed"); m.setText("Your Dayflow password was changed and existing sessions were revoked. Contact support immediately if this was not you."); sender.send(m);
  }
  public void invitation(String to, String token) {
    var m=new SimpleMailMessage(); m.setFrom(props.mailFrom()); m.setTo(to); m.setSubject("Your Dayflow HR invitation");
    m.setText("Open this time-limited invitation: "+props.appOrigin()+"/admin-invitation?token="+token+"\nIf you were not expecting this, do not open the link."); sender.send(m);
  }
}
