import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import { encode } from "gpt-3-encoder";


const BASE_URL = "https://the-constitution-of-uganda.vercel.app";
const CHUNK_SIZE = 200;

let CHAPTER_NUM = 1;
let CHAPTER_TITLE = "";

const getLinks = async () => {
  const html = await axios.get(BASE_URL);
  const $ = cheerio.load(html.data);
  const main = $("article");

  const links = main.find("a");
  const hrefs = links.map((i, link) => $(link).attr("href")).get();
  const filtered = hrefs.filter((href) => !href.startsWith("https")).filter((href, i, arr) => arr.indexOf(href) === i);

  return filtered;
};



const getSection = async (link) => {
  const html = await axios.get(link);
  const $ = cheerio.load(html.data);
  const text = $("article").text();

  

  const lines = text.split("\n").filter((line) => line.trim() !== "");

  let sectionText = "";
  let sectionTitle = "";

  if (lines[0].includes("Chapter")) {
    const split = lines[0].split("Chapter");

    CHAPTER_NUM = +split[1].trim();
    
    CHAPTER_TITLE = lines[1]

    sectionTitle = lines[2];

    sectionText = lines.slice(2).join(" ");
  } else {
    sectionTitle = lines[0];

    sectionText = lines.slice(1).join(" ");
  }

  const section = {
    chapter_num: CHAPTER_NUM,
    chapter_title: CHAPTER_TITLE,
    section_title: sectionTitle,
    section_url: link,
    section_num: 0, // handled in embed.ts
    content: sectionText,
    content_length: sectionText.length,
    content_tokens: encode(sectionText).length,
    chunks: []
  };

  return section;
};

const chunkSection = async (section) => {
  const { chunks, content, ...chunklessSection } = section;

  let sectionTextChunks = [];

  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split(". ");
    let chunkText = "";

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence);
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength.length > CHUNK_SIZE) {
        sectionTextChunks.push(chunkText);
        chunkText = "";
      }

      if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
        chunkText += sentence + ". ";
      } else {
        chunkText += sentence + " ";
      }
    }

    sectionTextChunks.push(chunkText.trim());
  } else {
    sectionTextChunks.push(content.trim());
  }

  const sectionChunks = sectionTextChunks.map((text) => {
    const trimmedText = text.trim();

    const chunk = {
      ...chunklessSection,
      content: trimmedText,
      content_length: trimmedText.length,
      content_tokens: encode(trimmedText).length,
      chunk_num: 0, // handled in embed.ts
      embedding: []
    };

    return chunk;
  });

  if (sectionChunks.length > 1) {
    for (let i = 0; i < sectionChunks.length; i++) {
      const chunk = sectionChunks[i];
      const prevChunk = sectionChunks[i - 1];

      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += " " + chunk.content;
        prevChunk.content_length += chunk.content_length;
        prevChunk.content_tokens += chunk.content_tokens;
        sectionChunks.splice(i, 1);
        i--;
      }
    }
  }

  const chunkedSection = {
    ...section,
    chunks: sectionChunks
  };

  return chunkedSection;
};

(async () => {
  const links = await getLinks();

  let sections= [];

  for (let i = 0; i < links.length; i++) {
    const link = `${BASE_URL}${links[i]}`;
    const section = await getSection(link);
    const chunkedSection = await chunkSection(section);
    sections.push(chunkedSection);
  }

  const book = {
    book_title: "The Constitution Of The Republic Of Uganda",
    author: "We The People Of Uganda",
    book_url: BASE_URL,
    publication_date: "1962-10-09",
    current_date: "2023-03-14",
    length: sections.reduce((acc, section) => acc + section.content_length, 0),
    tokens: sections.reduce((acc, section) => acc + section.content_tokens, 0),
    sections
  };

  fs.writeFileSync("ug.json", JSON.stringify(book, null, 2));
})();