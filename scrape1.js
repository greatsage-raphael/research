import puppeteer from "puppeteer";
import fs from "fs";
import { encode } from "gpt-3-encoder";


const BASE_URL = "http://www.kenyalaw.org:8181/exist/";
const url = "http://kenyalaw.org:8181/exist/kenyalex/actview.xql?actid=No.%2031%20of%202016"
const CHUNK_SIZE = 200;



const getLinks = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
  
    const links = await page.$$("tbody a");
    const filtered = [];
    
    // loop through all links and apply filter
    for (const link of links) {
      const href = await (await link.getProperty("href")).jsonValue();
      if (href.includes("exist")) {
        // filter the link and save the text after "exist"
        const filteredLink = href.split("exist")[1].substring(1);
        filtered.push(filteredLink);
      }
    }
  
    await browser.close();
    console.log(filtered);
    return filtered;
};



const getSection = async (link) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(link);

  const actTitleText = await page.$eval("tbody div.act-title", el => el.textContent);
  const actTitle = actTitleText.split(':')[1].trim();

  const contentCell = await page.$eval("#contentCell", (el) => el.innerHTML);
  const paragraphsString = contentCell.replace(/<[^>]*>?/gm, "\n").trim();
  const lines = paragraphsString.split("\n").filter((line) => line.trim() !== "");

  const sectionText = lines.join(" ")


  const links = await page.$$eval("tbody a", (elements) => 
    elements.map(el => el.href)
  );
  
  // filter for the link that ends with ".pdf"
  const pdfLink = links.find(link => link.endsWith('.pdf') && link.includes('docs'));

  await browser.close();

  const section = {
    act_title: actTitle,
    PDFLink: pdfLink,
    section_num: 0, // handled in embed.ts
    content: sectionText,
    content_length: sectionText.length,
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
    if (!link.endsWith('.pdf') && !link.includes('LEG')) {
      const section = await getSection(link);
      const chunkedSection = await chunkSection(section);
      sections.push(chunkedSection);
    }
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

  fs.writeFileSync("kenya.json", JSON.stringify(book, null, 2));
})();