import { Injectable, HttpStatus, HttpException } from "@nestjs/common";
import { PathRequestDto } from "../dto/path-request.dto";

export interface PathResult {
  path: string[];
  totalCost: number;
}

@Injectable()
export class RouteFinderService {
  /**
   * Main method to find the optimal path between nodes
   * @param request The path request containing graph and constraints
   * @returns The optimal path and its total cost
   */
  findOptimalPath(request: PathRequestDto): PathResult {
    const { start, end, nodes, edges, constraints } = request;
    const { blockedNodes, requiredStops } = constraints;

    // Create a graph representation using adjacency lists, excluding blocked nodes
    const graph = this.buildGraph(edges, blockedNodes);

    // Find the optimal path using Dijkstra's algorithm
    const result = this.dijkstra(graph, start, end, requiredStops);
    // Create array of all nodes that must be visited (required stops + end node)
    const allRequiredNodes = [...requiredStops, end];
    // Find any required nodes that don't exist in the graph
    const missingNodes = allRequiredNodes.filter(
      (node) => !nodes.includes(node)
    );
    // Throw error if any required nodes are missing from the graph
    if (missingNodes.length > 0) {
      throw new HttpException(
        `Missing required nodes ${missingNodes.join(", ")}`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Get all nodes that are part of any edge
    const edgeNodes = edges.flatMap((edge) => [edge.from, edge.to]);
    // Find any edge nodes that don't exist in the graph
    const invalidEdgeNodes = edgeNodes.filter((node) => !nodes.includes(node));

    // Throw error if any edge nodes are invalid (don't exist in the graph)
    if (invalidEdgeNodes.length > 0) {
      throw new HttpException(
        `Invalid edge nodes ${invalidEdgeNodes.join(",")}`,
        HttpStatus.BAD_REQUEST
      );
    }
    // Throw error if no valid path was found that satisfies all constraints
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
   * Builds an adjacency list representation of the graph
   * @param edges Array of edges in the graph
   * @param blockedNodes Array of nodes that cannot be traversed
   * @returns Map representing the graph structure
   */
  private buildGraph(
    edges: PathRequestDto["edges"],
    blockedNodes: string[]
  ): Map<string, Map<string, number>> {
    // Create a new Map to store the graph structure with costs
    const graph = new Map<string, Map<string, number>>();

    // Process each edge to build the graph
    for (const edge of edges) {
      // Skip edges connected to blocked nodes
      if (blockedNodes.includes(edge.from) || blockedNodes.includes(edge.to)) {
        continue;
      }

      // Initialize empty maps for nodes if they don't exist in the graph
      if (!graph.has(edge.from)) {
        graph.set(edge.from, new Map());
      }
      if (!graph.has(edge.to)) {
        graph.set(edge.to, new Map());
      }

      // Add bidirectional connections with costs (undirected graph)
      graph.get(edge.from)!.set(edge.to, edge.cost);
      graph.get(edge.to)!.set(edge.from, edge.cost);
    }

    return graph;
  }

  /**
   * Implements Dijkstra's algorithm to find the optimal path
   * @param graph The graph representation
   * @param start Starting node
   * @param end Ending node
   * @param requiredStops Nodes that must be visited
   * @param edges Original edges with costs
   * @returns The optimal path and its cost, or null if no path exists
   */
  private dijkstra(
    graph: Map<string, Map<string, number>>,
    start: string,
    end: string,
    requiredStops: string[]
  ): { path: string[]; cost: number } | null {
    // Create sequence of nodes that must be visited in order
    const sequence = [start, ...requiredStops, end];
    // Initialize empty array for the complete path
    let totalPath: string[] = [];
    // Initialize total cost to 0
    let totalCost = 0;

    // Find path between each consecutive pair of nodes in the sequence
    for (let i = 0; i < sequence.length - 1; i++) {
      // Get current start and end nodes for this segment
      const currentStart = sequence[i];
      const currentEnd = sequence[i + 1];

      // Initialize Dijkstra's algorithm data structures
      const { distances, previous } = this.initializeDijkstra(
        graph,
        currentStart
      );
      // Create sets to track visited and unvisited nodes
      const visited = new Set<string>();
      const unvisited = new Set<string>(graph.keys());

      // Main Dijkstra's algorithm loop
      while (unvisited.size > 0) {
        // Find the unvisited node with smallest distance
        const current = this.findNextNode(unvisited, distances);
        // Break if no node found or reached destination
        if (!current || current === currentEnd) break;
        // Update distances for neighbors
        this.updateNeighbors(
          current,
          graph,
          distances,
          previous,
          visited,
          unvisited
        );
      }

      // Reconstruct the path for this segment
      const segmentPath = this.reconstructSegmentPath(
        currentStart,
        currentEnd,
        previous
      );
      // Return null if no path found for this segment
      if (!segmentPath) return null;

      // Combine paths, avoiding duplicate nodes at segment boundaries
      if (i === 0) {
        totalPath = [...segmentPath];
      } else {
        totalPath = [...totalPath, ...segmentPath.slice(1)];
      }
      // Add the cost of this segment to total cost
      totalCost += distances.get(currentEnd)!;
    }

    // Return the complete path and total cost
    return { path: totalPath, cost: totalCost };
  }

  /**
   * Initializes the data structures needed for Dijkstra's algorithm
   */
  private initializeDijkstra(
    graph: Map<string, Map<string, number>>,
    start: string
  ) {
    // Create map to store distances from start to each node
    const distances = new Map<string, number>();
    // Create map to store previous node in optimal path
    const previous = new Map<string, string>();

    // Set initial distances to infinity for all nodes
    for (const node of graph.keys()) {
      distances.set(node, Infinity);
    }
    // Set start node distance to 0
    distances.set(start, 0);

    return { distances, previous };
  }

  /**
   * Finds the unvisited node with the smallest distance
   */
  private findNextNode(
    unvisited: Set<string>,
    distances: Map<string, number>
  ): string {
    // Initialize variables to track minimum distance node
    let current = "";
    let minDistance = Infinity;

    // Find the unvisited node with minimum distance
    for (const node of unvisited) {
      if (distances.get(node)! < minDistance) {
        minDistance = distances.get(node)!;
        current = node;
      }
    }

    return current;
  }

  /**
   * Updates the distances and previous nodes for neighbors of the current node
   */
  private updateNeighbors(
    current: string,
    graph: Map<string, Map<string, number>>,
    distances: Map<string, number>,
    previous: Map<string, string>,
    visited: Set<string>,
    unvisited: Set<string>
  ) {
    // Mark current node as visited
    unvisited.delete(current);
    visited.add(current);

    // Get all neighbors and their costs from the graph
    const neighbors = graph.get(current) || new Map();

    // Process each neighbor
    for (const [neighbor, cost] of neighbors.entries()) {
      // Skip if neighbor is already visited
      if (visited.has(neighbor)) continue;

      // Calculate new distance through current node
      const newDistance = distances.get(current)! + cost;
      // Update if new path is shorter
      if (newDistance < distances.get(neighbor)!) {
        distances.set(neighbor, newDistance);
        previous.set(neighbor, current);
      }
    }
  }

  /**
   * Reconstructs the path from start to end using the previous node map
   */
  private reconstructSegmentPath(
    start: string,
    end: string,
    previous: Map<string, string>
  ): string[] | null {
    // Initialize empty array for the path
    const path: string[] = [];
    // Start from the end node
    let current = end;

    // Backtrack from end to start using the previous node map
    while (current !== start) {
      // Add current node to beginning of path
      path.unshift(current);
      // Get previous node in path
      current = previous.get(current)!;
      // Return null if path is broken
      if (!current) return null;
    }
    // Add start node to beginning of path
    path.unshift(start);
    return path;
  }
}
