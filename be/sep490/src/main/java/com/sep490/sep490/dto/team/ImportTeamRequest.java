package com.sep490.sep490.dto.team;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ImportTeamRequest {
    private String teamName;
    private String topicName;
    private Integer leaderId;
    private List<Integer> memberIds;
}
