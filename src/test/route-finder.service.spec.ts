import { Test, TestingModule } from "@nestjs/testing";
import { RouteFinderService } from "../route-finder/route-finder.service";
import {
  basicGraphRequest,
  invalidPathRequest,
  complexGraphRequest,
} from "./test.data";

describe("RouteFinderService", () => {
  let service: RouteFinderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RouteFinderService],
    }).compile();

    service = module.get<RouteFinderService>(RouteFinderService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findOptimalPath", () => {
    it("should find the optimal path with constraints", () => {
      const result = service.findOptimalPath(basicGraphRequest);

      // Basic validation
      expect(result).toBeDefined();
      expect(result.path).toBeDefined();
      expect(result.totalCost).toBeDefined();

      // Path constraints
      expect(result.path[0]).toBe(basicGraphRequest.start);
      expect(result.path[result.path.length - 1]).toBe(basicGraphRequest.end);
      basicGraphRequest.constraints.requiredStops.forEach((stop) => {
        expect(result.path).toContain(stop);
      });
      basicGraphRequest.constraints.blockedNodes.forEach((node) => {
        expect(result.path).not.toContain(node);
      });

      // Path validity
      for (let i = 0; i < result.path.length - 1; i++) {
        const current = result.path[i];
        const next = result.path[i + 1];
        const edgeExists = basicGraphRequest.edges.some(
          (edge) =>
            (edge.from === current && edge.to === next) ||
            (edge.from === next && edge.to === current)
        );
        expect(edgeExists).toBe(true);
      }

      // Cost validation
      let calculatedCost = 0;
      for (let i = 0; i < result.path.length - 1; i++) {
        const current = result.path[i];
        const next = result.path[i + 1];
        const edge = basicGraphRequest.edges.find(
          (e) =>
            (e.from === current && e.to === next) ||
            (e.from === next && e.to === current)
        );
        if (edge) {
          calculatedCost += edge.cost;
        }
      }
      expect(result.totalCost).toBe(calculatedCost);
    });

    it("should throw error when no valid path exists", () => {
      expect(() => service.findOptimalPath(invalidPathRequest)).toThrow(
        "No valid path found that satisfies all constraints of C"
      );
    });

    it("should find the optimal path in a complex graph with multiple constraints", () => {
      const result = service.findOptimalPath(complexGraphRequest);

      // Basic validation
      expect(result).toBeDefined();
      expect(result.path).toBeDefined();
      expect(result.totalCost).toBeDefined();

      // Path constraints
      expect(result.path[0]).toBe(complexGraphRequest.start);
      expect(result.path[result.path.length - 1]).toBe(complexGraphRequest.end);
      complexGraphRequest.constraints.requiredStops.forEach((stop) => {
        expect(result.path).toContain(stop);
      });
      complexGraphRequest.constraints.blockedNodes.forEach((node) => {
        expect(result.path).not.toContain(node);
      });

      // Path validity
      for (let i = 0; i < result.path.length - 1; i++) {
        const current = result.path[i];
        const next = result.path[i + 1];
        const edgeExists = complexGraphRequest.edges.some(
          (edge) =>
            (edge.from === current && edge.to === next) ||
            (edge.from === next && edge.to === current)
        );
        expect(edgeExists).toBe(true);
      }

      // Cost validation
      let calculatedCost = 0;
      for (let i = 0; i < result.path.length - 1; i++) {
        const current = result.path[i];
        const next = result.path[i + 1];
        const edge = complexGraphRequest.edges.find(
          (e) =>
            (e.from === current && e.to === next) ||
            (e.from === next && e.to === current)
        );
        if (edge) {
          calculatedCost += edge.cost;
        }
      }
      expect(result.totalCost).toBe(calculatedCost);
    });
  });
});
