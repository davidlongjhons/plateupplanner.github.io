import { SquareType, WallType } from "../../helpers";
import { Layout } from "../../Layout";

export class SerializerV2 {
  private static characterMap = new Map([
    [0, "0"],
    [1, "1"],
    [2, "2"],
    [3, "3"],
    [4, "4"],
    [5, "5"],
    [6, "6"],
    [7, "7"],
    [8, "8"],
    [9, "9"],
    [10, "a"],
    [11, "b"],
    [12, "c"],
    [13, "d"],
    [14, "e"],
    [15, "f"],
  ]);

  private static characterUnMap = new Map([
    ["0", 0],
    ["1", 1],
    ["2", 2],
    ["3", 3],
    ["4", 4],
    ["5", 5],
    ["6", 6],
    ["7", 7],
    ["8", 8],
    ["9", 9],
    ["a", 10],
    ["b", 11],
    ["c", 12],
    ["d", 13],
    ["e", 14],
    ["f", 15],
  ]);

  // 0b00 reserved as error state
  private static wallEncodeMap = new Map([
    ["line-empty", 0b11],
    ["line-wall", 0b01],
    ["line-half", 0b10],
  ]);

  private static wallDecodeMap = new Map([
    [0b11, "0"],
    [0b01, "w"],
    [0b10, "h"],
  ]);

  private static bitsPerWall = 2;

  // Extracts the ith wall from an encoding in the characterUnMap
  private static extractWallAtIndex(wallEncoding: number, i: number) {
    const extractor = (1 << SerializerV2.bitsPerWall) - 1; // 0b11
    const shift = i * SerializerV2.bitsPerWall;
    const wallRepresentation = (wallEncoding >> shift) & extractor
    return wallRepresentation;
  }

  // Extracts a list of walls from a given wall encoding
  private static extractWalls(wallEncoding: number) {
    return ([...Array(SerializerV2.bitsPerWall)]).map((_, i) => {
      return SerializerV2.extractWallAtIndex(wallEncoding, i);
    });
  }

  static *deserializeWalls(wallEncoding: string): Generator<string, null, null> {
    const walls = wallEncoding
      .split('')
      .map((char) => {
        const wallEncoding = SerializerV2.characterUnMap.get(char);
        if (wallEncoding === undefined) {
          throw new URIError(`Invalid characterUnMap character, cannot decode walls: ${char}`);
        } else {
          return wallEncoding;
        }
      })
      .map((wallEncoding) => SerializerV2.extractWalls(wallEncoding))
      .flat()
      .map((wallCode) => {
        const wall = SerializerV2.wallDecodeMap.get(wallCode);
        if (wall === undefined) {
          throw new URIError(`Invalid wallDecodeMap representation, cannot decode walls: ${wallCode}`);
        } else {
          return wall;
        }
      });

    for (const wall of walls) {
      yield wall;
    }

    return null;
  }
}


export default function decodeLayoutV2(decompressed: string) {
  let [version, size, layoutString, wallString] = decompressed.split(" ");
  if (version !== "v2") {
    throw new URIError("Invalid layout string version");
  }
  let [height, width] = size.split("x").map((x) => parseInt(x));

  const wallsDecoded = SerializerV2.deserializeWalls(wallString);

  let layout = new Layout(height, width);
  const numVerticalElements = layout.height * 2 - 1;
  const numHorizontalElements = layout.width * 2 - 1;
  for (let i = 0; i < numVerticalElements; i++) {
    for (let j = 0; j < numHorizontalElements; j++) {
      // Squares (2 characters + 1 for rotation)
      if (i % 2 === 0 && j % 2 === 0) {
        let squareStrRepr = layoutString.slice(0, 3);
        layoutString = layoutString.slice(3);
        layout.setElement(i, j, SquareType.fromStrRepr(squareStrRepr));
        // Walls (0.5 characters, 1 character = 2 walls)
      } else if (i % 2 === 0 || j % 2 === 0) { // Skip Corner Walls
        let wallStrRepr = wallsDecoded.next().value;
        if (!!wallStrRepr) {
          const wall = WallType.fromStrRepr(wallStrRepr)
          layout.setElement(i, j, wall);
        } else {
          throw new URIError('Invalid Encoding of Walls');
        }
      }
    }
  }
  layout.fixCornerWalls();
  return layout;
}