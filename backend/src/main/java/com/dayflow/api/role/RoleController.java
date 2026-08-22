package com.dayflow.api.role;

import com.dayflow.api.common.ApiResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roles")
public class RoleController {
  private final RoleRepository roleRepository;

  public RoleController(RoleRepository roleRepository) {
    this.roleRepository = roleRepository;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('role:read')")
  public ApiResponse<List<Role>> list() {
    return ApiResponse.ok(roleRepository.findAll());
  }
}
