// src/app/api/bottle-types/route.ts

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "src",
      "data",
      "bottleTypes.json"
    );

    const file = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(file);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Bottle types error:", error);

    return NextResponse.json(
      {
        error: "Failed to load bottle types",
      },
      {
        status: 500,
      }
    );
  }
}