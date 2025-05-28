import {
  IsString,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
export class EdgeDto {
  @ApiProperty({ example: "A" })
  @IsString()
  from: string;

  @ApiProperty({ example: "B" })
  @IsString()
  to: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  cost: number;
}

export class ConstraintsDto {
  @ApiProperty({ example: ["G", "D"] })
  @IsArray()
  @IsString({ each: true })
  blockedNodes: string[];

  @ApiProperty({ example: ["E", "H"] })
  @IsArray()
  @IsString({ each: true })
  requiredStops: string[];
}

export class PathRequestDto {
  @ApiProperty({ example: "A" })
  @IsString()
  start: string;

  @ApiProperty({ example: "L" })
  @IsString()
  end: string;

  @ApiProperty({
    example: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  nodes: string[];

  @ApiProperty({ type: [EdgeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EdgeDto)
  edges: EdgeDto[];

  @ApiProperty({ type: ConstraintsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ConstraintsDto)
  constraints: ConstraintsDto;
}
