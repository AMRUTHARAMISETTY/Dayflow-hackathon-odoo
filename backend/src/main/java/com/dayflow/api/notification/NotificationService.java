package com.dayflow.api.notification;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * In-app notifications with a real-time push channel via SSE (spec section 11: "Real-time
 * notification count through SSE or WebSocket"). Delivery is best-effort: the notification is
 * always persisted first, so a client that reconnects later still sees it via the REST list —
 * the SSE push is just a live nudge for clients already connected.
 */
@Service
public class NotificationService {
  private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

  private final NotificationRepository repository;
  private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

  public NotificationService(NotificationRepository repository) {
    this.repository = repository;
  }

  public Notification notify(long userId, String category, String severity, String title, String body, String link) {
    Notification created = repository.create(userId, category, severity, title, body, link);
    push(userId, "notification", created);
    push(userId, "unread-count", Map.of("count", repository.unreadCount(userId)));
    return created;
  }

  public List<Notification> list(long userId, boolean unreadOnly, int limit) {
    return repository.forUser(userId, unreadOnly, limit);
  }

  public int unreadCount(long userId) {
    return repository.unreadCount(userId);
  }

  public void markRead(long userId, long notificationId) {
    repository.markRead(userId, notificationId);
    push(userId, "unread-count", Map.of("count", repository.unreadCount(userId)));
  }

  public void markAllRead(long userId) {
    repository.markAllRead(userId);
    push(userId, "unread-count", Map.of("count", 0));
  }

  public SseEmitter subscribe(long userId) {
    SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
    emittersByUser.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);
    emitter.onCompletion(() -> removeEmitter(userId, emitter));
    emitter.onTimeout(() -> removeEmitter(userId, emitter));
    emitter.onError(ex -> removeEmitter(userId, emitter));
    try {
      emitter.send(SseEmitter.event().name("unread-count").data(Map.of("count", repository.unreadCount(userId))));
    } catch (IOException ex) {
      removeEmitter(userId, emitter);
    }
    return emitter;
  }

  @Scheduled(fixedRate = 25_000)
  void heartbeat() {
    emittersByUser.forEach((userId, emitters) -> emitters.forEach(emitter -> {
      try {
        emitter.send(SseEmitter.event().name("ping").data("keep-alive"));
      } catch (IOException ex) {
        removeEmitter(userId, emitter);
      }
    }));
  }

  private void push(long userId, String eventName, Object payload) {
    CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
    if (emitters == null) {
      return;
    }
    emitters.forEach(emitter -> {
      try {
        emitter.send(SseEmitter.event().name(eventName).data(payload));
      } catch (IOException ex) {
        removeEmitter(userId, emitter);
      }
    });
  }

  private void removeEmitter(long userId, SseEmitter emitter) {
    CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
    if (emitters != null) {
      emitters.remove(emitter);
    }
  }
}
