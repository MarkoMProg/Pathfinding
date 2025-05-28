import { Module } from "@nestjs/common";
import { GraphController } from "./graph.controller";
import { RouteFinderService } from "../route-finder/route-finder.service";

@Module({
  controllers: [GraphController],
  providers: [RouteFinderService],
})
export class GraphModule {}
