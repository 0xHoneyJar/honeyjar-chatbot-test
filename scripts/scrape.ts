import { PGChunk, PGEssay, PGJSON } from "@/types";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import { encode } from "gpt-3-encoder";

const BASE_URL = "https://0xhoneyjar.mirror.xyz/";
const CHUNK_SIZE = 200;

const getLinks = async () => {
  const html = await axios.get(`${BASE_URL}`);
  const $ = cheerio.load(html.data);

  const linksArr: { url: string; title: string }[] = [];

  // start from the body
  let body = $("body");

  // target the first div
  let firstDiv = body.children("div").first();

  // target the second div within the first div
  let secondDiv = firstDiv.children("div").eq(1);

  // target the first div within the second div
  let nestedFirstDiv = secondDiv.children("div").first();

  // target the fifth div within the nested first div
  let finalDiv = nestedFirstDiv.children("div").eq(4);

  // find the a tags within the final div
  let links = finalDiv.find("a");

  links.each((i, link) => {
    const url = $(link).attr("href");
    const title = $(link).text();

    if (url) {
      const linkObj = {
        url,
        title,
      };

      linksArr.push(linkObj);
    }
  });

  return linksArr;
};

const getEssay = async (linkObj: { url: string; title: string }) => {
  const { title, url } = linkObj;

  let essay: PGEssay = {
    url: "",
    content: "",
    length: 0,
    tokens: 0,
    chunks: [],
  };

  const fullLink = url;
  const html = await axios.get(fullLink);
  const $ = cheerio.load(html.data);

  // start from the body
  let body = $("body");

  // target the first div
  let firstDiv = body.children("div").first();

  // target the second div within the first div
  let secondDiv = firstDiv.children("div").eq(1);

  // target the first div within the second div
  let nestedFirstDiv = secondDiv.children("div").first();

  // target the sixth div within the nested first div
  let finalDiv = nestedFirstDiv.children("div").eq(5);

  // target the inner child div of final div
  let finalInnerDiv = finalDiv.children("div").first();

  let pTag = finalInnerDiv.find("p");

  let combinedText = "";

  pTag.each((i, p) => {
    const text = $(p).text();

    let cleanedText = text.replace(/\s+/g, " ");
    cleanedText = cleanedText.replace(/\.([a-zA-Z])/g, ". $1");

    combinedText += cleanedText + " ";
  });

  essay = {
    url: fullLink,
    content: combinedText,
    length: combinedText.length,
    tokens: encode(combinedText).length,
    chunks: [],
  };

  return essay;
};

const chunkEssay = async (essay: PGEssay) => {
  const { url, content, ...chunklessSection } = essay;

  let essayTextChunks = [];

  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split(". ");
    let chunkText = "";

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence);
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength.length > CHUNK_SIZE) {
        essayTextChunks.push(chunkText);
        chunkText = "";
      }

      if (
        sentence.length > 0 &&
        sentence[sentence.length - 1].match(/[a-z0-9]/i)
      ) {
        chunkText += sentence + ". ";
      } else {
        chunkText += sentence + " ";
      }
    }

    essayTextChunks.push(chunkText.trim());
  } else {
    essayTextChunks.push(content.trim());
  }

  const essayChunks = essayTextChunks.map((text) => {
    const trimmedText = text.trim();

    const chunk: PGChunk = {
      essay_url: url,
      content: trimmedText,
      content_length: trimmedText.length,
      content_tokens: encode(trimmedText).length,
      embedding: [],
    };

    return chunk;
  });

  if (essayChunks.length > 1) {
    for (let i = 0; i < essayChunks.length; i++) {
      const chunk = essayChunks[i];
      const prevChunk = essayChunks[i - 1];

      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += " " + chunk.content;
        prevChunk.content_length += chunk.content_length;
        prevChunk.content_tokens += chunk.content_tokens;
        essayChunks.splice(i, 1);
        i--;
      }
    }
  }

  const chunkedSection: PGEssay = {
    ...essay,
    chunks: essayChunks,
  };

  return chunkedSection;
};

(async () => {
  const links = await getLinks();

  let essays = [];

  for (let i = 0; i < links.length; i++) {
    const essay = await getEssay(links[i]);
    console.log(essay);
    const chunkedEssay = await chunkEssay(essay);
    essays.push(chunkedEssay);
  }

  const json: PGJSON = {
    url: "https://0xhoneyjar.mirror.xyz/",
    length: essays.reduce((acc, essay) => acc + essay.length, 0),
    tokens: essays.reduce((acc, essay) => acc + essay.tokens, 0),
    essays,
  };

  fs.writeFileSync("scripts/pg.json", JSON.stringify(json));
})();
