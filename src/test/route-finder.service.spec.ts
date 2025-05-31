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

  describe("validateNodesExist", () => {
    it("should validate all nodes exist", () => {
      const validNodes = ["A", "B", "C"];
      const edges = [{ from: "A", to: "B", cost: 1 }];
      const mustExistNodes = ["A", "B"];

      expect(() =>
        service["validateNodesExist"](validNodes, edges, mustExistNodes)
      ).not.toThrow();
    });

    it("should throw error when required nodes are missing", () => {
      const validNodes = ["A", "B"];
      const edges = [{ from: "A", to: "B", cost: 1 }];
      const mustExistNodes = ["A", "B", "C"];

      expect(() =>
        service["validateNodesExist"](validNodes, edges, mustExistNodes)
      ).toThrow("Missing required nodes: C");
    });

    it("should throw error when edge nodes are invalid", () => {
      const validNodes = ["A", "B"];
      const edges = [{ from: "A", to: "C", cost: 1 }];
      const mustExistNodes = ["A", "B"];

      expect(() =>
        service["validateNodesExist"](validNodes, edges, mustExistNodes)
      ).toThrow("Invalid edge nodes: C");
    });
  });

  describe("buildGraph", () => {
    it("should build graph correctly", () => {
      const edges = [
        { from: "A", to: "B", cost: 1 },
        { from: "B", to: "C", cost: 2 },
      ];
      const blockedNodes: string[] = [];

      const graph = service["buildGraph"](edges, blockedNodes);

      expect(graph.has("A")).toBe(true);
      expect(graph.has("B")).toBe(true);
      expect(graph.has("C")).toBe(true);
      expect(graph.get("A")?.get("B")).toBe(1);
      expect(graph.get("B")?.get("A")).toBe(1);
      expect(graph.get("B")?.get("C")).toBe(2);
      expect(graph.get("C")?.get("B")).toBe(2);
    });

    it("should exclude blocked nodes", () => {
      const edges = [
        { from: "A", to: "B", cost: 1 },
        { from: "B", to: "C", cost: 2 },
      ];
      const blockedNodes = ["B"];

      const graph = service["buildGraph"](edges, blockedNodes);

      expect(graph.has("A")).toBe(false);
      expect(graph.has("B")).toBe(false);
      expect(graph.has("C")).toBe(false);
    });

    it("should handle empty edges array", () => {
      const graph = service["buildGraph"]([], []);
      expect(graph.size).toBe(0);
    });
  });

  describe("findPathWithRequiredStops", () => {
    it("should find path with required stops", () => {
      const graph = new Map();
      graph.set("A", new Map([["B", 1]]));
      graph.set("B", new Map([["A", 1], ["C", 2]]));
      graph.set("C", new Map([["B", 2]]));

      const result = service["findPathWithRequiredStops"](
        graph,
        "A",
        "C",
        ["B"]
      );

      expect(result).toBeDefined();
      expect(result?.path).toEqual(["A", "B", "C"]);
      expect(result?.cost).toBe(3);
    });

    it("should return null when no path exists", () => {
      const graph = new Map();
      graph.set("A", new Map([["B", 1]]));
      graph.set("B", new Map([["A", 1]]));
      graph.set("C", new Map());

      const result = service["findPathWithRequiredStops"](
        graph,
        "A",
        "C",
        ["B"]
      );

      expect(result).toBeNull();
    });
  });

  describe("dijkstra", () => {
    it("should find shortest path", () => {
      const graph = new Map();
      graph.set("A", new Map([["B", 1], ["C", 4]]));
      graph.set("B", new Map([["A", 1], ["C", 2]]));
      graph.set("C", new Map([["A", 4], ["B", 2]]));

      const result = service["dijkstra"](graph, "A", "C");

      expect(result).toBeDefined();
      expect(result?.path).toEqual(["A", "B", "C"]);
      expect(result?.cost).toBe(3);
    });

    it("should return null when no path exists", () => {
      const graph = new Map();
      graph.set("A", new Map([["B", 1]]));
      graph.set("B", new Map([["A", 1]]));
      graph.set("C", new Map());

      const result = service["dijkstra"](graph, "A", "C");

      expect(result).toBeNull();
    });

    it("should handle start equals end", () => {
      const graph = new Map();
      graph.set("A", new Map([["B", 1]]));
      graph.set("B", new Map([["A", 1]]));

      const result = service["dijkstra"](graph, "A", "A");

      expect(result).toBeDefined();
      expect(result?.path).toEqual(["A"]);
      expect(result?.cost).toBe(0);
    });
  });

  describe("processNeighbors", () => {
    it("should process neighbors correctly", () => {
      const graph = new Map();
      graph.set("A", new Map([["B", 1], ["C", 4]]));
      graph.set("B", new Map([["A", 1], ["C", 2]]));
      graph.set("C", new Map([["A", 4], ["B", 2]]));

      const unvisited = new Set<string>(["B", "C"]);
      const distances = new Map([
        ["A", 0],
        ["B", Infinity],
        ["C", Infinity],
      ]);
      const previous = new Map([
        ["A", null],
        ["B", null],
        ["C", null],
      ]);

      service["processNeighbors"]("A", graph, unvisited, distances, previous);

      expect(distances.get("B")).toBe(1);
      expect(distances.get("C")).toBe(4);
      expect(previous.get("B")).toBe("A");
      expect(previous.get("C")).toBe("A");
    });

    it("should not process visited neighbors", () => {
      const graph = new Map();
      graph.set("A", new Map([["B", 1]]));
      graph.set("B", new Map([["A", 1]]));

      const unvisited = new Set<string>();
      const distances = new Map([
        ["A", 0],
        ["B", Infinity],
      ]);
      const previous = new Map([
        ["A", null],
        ["B", null],
      ]);

      service["processNeighbors"]("A", graph, unvisited, distances, previous);

      expect(distances.get("B")).toBe(Infinity);
      expect(previous.get("B")).toBe(null);
    });
  });

  describe("getMinDistanceNode", () => {
    it("should return node with minimum distance", () => {
      const unvisited = new Set<string>(["A", "B", "C"]);
      const distances = new Map([
        ["A", 1],
        ["B", 0],
        ["C", 2],
      ]);

      const result = service["getMinDistanceNode"](unvisited, distances);

      expect(result).toBe("B");
    });

    it("should return null when all distances are Infinity", () => {
      const unvisited = new Set<string>(["A", "B", "C"]);
      const distances = new Map([
        ["A", Infinity],
        ["B", Infinity],
        ["C", Infinity],
      ]);

      const result = service["getMinDistanceNode"](unvisited, distances);

      expect(result).toBeNull();
    });
  });

  describe("reconstructPath", () => {
    it("should reconstruct path correctly", () => {
      const previous = new Map([
        ["A", null],
        ["B", "A"],
        ["C", "B"],
      ]);

      const result = service["reconstructPath"]("A", "C", previous);

      expect(result).toEqual(["A", "B", "C"]);
    });

    it("should return null when no path exists", () => {
      const previous = new Map([
        ["A", null],
        ["B", null],
        ["C", null],
      ]);

      const result = service["reconstructPath"]("A", "C", previous);

      expect(result).toBeNull();
    });

    it("should handle start equals end", () => {
      const previous = new Map([["A", null]]);

      const result = service["reconstructPath"]("A", "A", previous);

      expect(result).toEqual(["A"]);
    });
  });
});
