import { getJson } from "serpapi";
import fs from "fs";

type GoogleJobsParameters = {
  q: string;
  hl: string;
  api_key: string;
  engine?: string;
  location?: string;
  start?: number;
};

const params = {
  q: "software engineer via ziprecruiter",
  hl: "en",
  api_key: "88b22151dca1a91d8302601288e37b4fda05dc5554f35c37ddf3e31b66063967",
  engine: "google_jobs",
  location: "San Francisco, Bay Area, United States",
  start: 30,
} satisfies GoogleJobsParameters;

async function main() {
  try {
    // Show result as JSON
    const response = await getJson(params);
    console.log(response["jobs_results"]);
    fs.writeFileSync(
      "scripts/jobs.json",
      JSON.stringify(response["jobs_results"])
    );
  } catch (error) {
    console.error(error);
  }
}

main();
