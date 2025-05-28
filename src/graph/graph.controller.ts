import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  RouteFinderService,
  PathResult,
} from "../route-finder/route-finder.service";
import { PathRequestDto } from "../dto/path-request.dto";

@ApiTags("graph")
@Controller("graph")
export class GraphController {
  constructor(private readonly routeFinderService: RouteFinderService) {}

  @Post("find-path")
  @ApiOperation({ summary: "Find optimal path between two nodes" })
  @ApiResponse({
    status: 201,
    description: "Returns the optimal path and its total cost",
    schema: {
      type: "object",
      properties: {
        path: {
          type: "array",
          items: { type: "string" },
          example: ["A", "B", "C", "E", "F"],
        },
        totalCost: {
          type: "number",
          example: 9,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 404, description: "No valid path found" })
  findPath(@Body() request: PathRequestDto): PathResult {
    return this.routeFinderService.findOptimalPath(request);
  }
}
