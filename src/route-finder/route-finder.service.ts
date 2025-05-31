import { Injectable, HttpStatus, HttpException } from "@nestjs/common";
import { PathRequestDto } from "../dto/path-request.dto";

/**
 * Interface representing the result of a path finding operation
 * Contains the complete path and its total cost
 */
export interface PathResult {
  path: string[];
  totalCost: number;
}

@Injectable()
export class RouteFinderService {
  /**
   * Main method to find the optimal path between nodes
   * Validates input, builds graph, and finds path with required stops
   * @param request The path request containing graph and constraints
   * @returns The optimal path and its total cost
   * @throws HttpException if no valid path is found
   */
  findOptimalPath(request: PathRequestDto): PathResult {
    const { start, end, nodes, edges, constraints } = request;
    const { blockedNodes = [], requiredStops = [] } = constraints;

    this.validateNodesExist(nodes, edges, requiredStops.concat(end));

    const graph = this.buildGraph(edges, blockedNodes);
    const result = this.findPathWithRequiredStops(graph, start, end, requiredStops);

    if (!result) {
      throw new HttpException(
        `No valid path found that satisfies all constraints of ${requiredStops}`,
        HttpStatus.BAD_REQUEST
      );
    }

    return {
      path: result.path,
      totalCost: result.cost,
    };
  }

  /**
   * Validates that all required nodes exist in the graph
   * Checks both required stops and nodes used in edges
   * @param validNodes List of all valid nodes in the graph
   * @param edges List of edges in the graph
   * @param mustExistNodes Nodes that must exist in the graph
   * @throws HttpException if any required nodes are missing
   */
  private validateNodesExist(
    validNodes: string[],
    edges: PathRequestDto["edges"],
    mustExistNodes: string[]
  ) {
    const missing = mustExistNodes.filter((node) => !validNodes.includes(node));
    if (missing.length) {
      throw new HttpException(
        `Missing required nodes: ${missing.join(", ")}`,
        HttpStatus.BAD_REQUEST
      );
    }

    const invalidEdgeNodes = edges
      .flatMap((e) => [e.from, e.to])
      .filter((n) => !validNodes.includes(n));
    if (invalidEdgeNodes.length) {
      throw new HttpException(
        `Invalid edge nodes: ${invalidEdgeNodes.join(", ")}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Builds an adjacency list representation of the graph
   * Creates a bidirectional graph excluding blocked nodes
   * @param edges Array of edges in the graph
   * @param blockedNodes Array of nodes that cannot be traversed
   * @returns Map representing the graph structure with costs
   */
  private buildGraph(
    edges: PathRequestDto["edges"],
    blockedNodes: string[]
  ): Map<string, Map<string, number>> {
    const graph = new Map<string, Map<string, number>>();

    for (const { from, to, cost } of edges) {
      if (blockedNodes.includes(from) || blockedNodes.includes(to)) continue;

      if (!graph.has(from)) graph.set(from, new Map());
      if (!graph.has(to)) graph.set(to, new Map());

      graph.get(from)!.set(to, cost);
      graph.get(to)!.set(from, cost); // Undirected graph
    }

    return graph;
  }

  /**
   * Finds a path that visits all required stops in sequence
   * Uses Dijkstra's algorithm for each segment between stops
   * @param graph The graph representation
   * @param start Starting node
   * @param end Destination node
   * @param requiredStops Nodes that must be visited in order
   * @returns Complete path and total cost, or null if no path exists
   */
  private findPathWithRequiredStops(
    graph: Map<string, Map<string, number>>,
    start: string,
    end: string,
    requiredStops: string[]
  ): { path: string[]; cost: number } | null {
    const sequence = [start, ...requiredStops, end];
    let totalPath: string[] = [];
    let totalCost = 0;

    for (let i = 0; i < sequence.length - 1; i++) {
      const segment = this.dijkstra(graph, sequence[i], sequence[i + 1]);
      if (!segment) return null;

      totalCost += segment.cost;
      totalPath = i === 0
        ? segment.path
        : [...totalPath, ...segment.path.slice(1)];
    }

    return { path: totalPath, cost: totalCost };
  }

  /**
   * Implementation of Dijkstra's algorithm for finding shortest path
   * @param graph The graph representation
   * @param start Starting node
   * @param end Destination node
   * @returns Shortest path and its cost, or null if no path exists
   */
  private dijkstra(
    graph: Map<string, Map<string, number>>,
    start: string,
    end: string
  ): { path: string[]; cost: number } | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>(graph.keys());

    for (const node of unvisited) distances.set(node, Infinity);
    distances.set(start, 0);

    while (unvisited.size > 0) {
      const current = this.getMinDistanceNode(unvisited, distances);
      if (!current || current === end) break;

      unvisited.delete(current);
      this.processNeighbors(current, graph, unvisited, distances, previous);
    }

    const path = this.reconstructPath(start, end, previous);
    return path ? { path, cost: distances.get(end)! } : null;
  }

  /**
   * Processes neighbors of current node in Dijkstra's algorithm
   * Updates distances and previous nodes if better path is found
   * @param current Current node being processed
   * @param graph The graph representation
   * @param unvisited Set of unvisited nodes
   * @param distances Map of current distances to nodes
   * @param previous Map of previous nodes in shortest paths
   */
  private processNeighbors(
    current: string,
    graph: Map<string, Map<string, number>>,
    unvisited: Set<string>,
    distances: Map<string, number>,
    previous: Map<string, string | null>
  ): void {
    const neighbors = graph.get(current) || new Map();
    for (const [neighbor, cost] of neighbors) {
      if (!unvisited.has(neighbor)) continue;

      const newDist = distances.get(current)! + cost;
      if (newDist < distances.get(neighbor)!) {
        distances.set(neighbor, newDist);
        previous.set(neighbor, current);
      }
    }
  }

  /**
   * Finds the unvisited node with minimum distance
   * @param unvisited Set of unvisited nodes
   * @param distances Map of current distances to nodes
   * @returns Node with minimum distance, or null if all nodes are unreachable
   */
  private getMinDistanceNode(
    unvisited: Set<string>,
    distances: Map<string, number>
  ): string | null {
    let minNode: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      const dist = distances.get(node)!;
      if (dist < minDistance) {
        minDistance = dist;
        minNode = node;
      }
    }

    return minNode;
  }

  /**
   * Reconstructs the shortest path from start to end
   * Uses the previous node map to trace back the path
   * @param start Starting node
   * @param end Destination node
   * @param previous Map of previous nodes in shortest paths
   * @returns Array of nodes representing the path, or null if no path exists
   */
  private reconstructPath(
    start: string,
    end: string,
    previous: Map<string, string | null>
  ): string[] | null {
    const path: string[] = [];
    let current: string | null = end;

    while (current && current !== start) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    if (!current) return null;

    path.unshift(start);
    return path;
  }
}
