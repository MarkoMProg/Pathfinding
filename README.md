# Pathfinding Challenge

## Setup
```bash
npm install
npm run start:dev
```

## API Documentation
Visit http://localhost:3000/api for Swagger UI documentation

## API Usage
### Find Optimal Path
```bash
POST /graph/find-path
```
Example request:
```json
{
  "start": "A",
  "end": "L",
  "nodes": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
  "edges": [
    { "from": "A", "to": "B", "cost": 2 },
    { "from": "A", "to": "C", "cost": 4 }
  ],
  "constraints": {
    "blockedNodes": ["G", "D"],
    "requiredStops": ["E", "H"]
  }
}
```

## Algorithm Choice
This implementation uses Dijkstra's algorithm because:

### Advantages
- Guarantees the shortest path
- Works efficiently with weighted edges
- Time complexity: O((V + E) log V) where V is vertices and E is edges
- Space complexity: O(V)

### Implementation Details
- Handles required stops by breaking the path into segments
- Each segment uses Dijkstra's algorithm to find the optimal path
- Blocked nodes are excluded during graph construction
- Maintains optimality while satisfying all constraints

### Why Not Other Algorithms?
- **DFS**: Would need to explore all possible paths, leading to O(V!) complexity
- **BFS**: Doesn't handle weighted edges efficiently
- **A***: Unnecessary for this use case as we don't have a heuristic function

## Testing
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov
```

## Error Handling
The API handles several error cases:
- Invalid node references
- Missing required stops
- No valid path found
- Invalid input format

## Project Structure
- `src/route-finder`: Main pathfinding logic
- `src/dto`: Data transfer objects
- `src/test`: Unit and integration tests
