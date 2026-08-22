package com.dayflow.api.team;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AddTeamMembersRequest(@NotNull List<@Valid MemberSelection> members) {}
