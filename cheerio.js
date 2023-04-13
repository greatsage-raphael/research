import axios from "axios";
import * as cheerio from "cheerio";


const BASE_URL = "https://the-constitution-of-uganda.vercel.app/";

const getLinks = async () => {
  const html = await axios.get(BASE_URL);
  const $ = cheerio.load(html.data);
  const main = $("article");

  const links = main.find("a");
  const hrefs = links.map((i, link) => $(link).attr("href")).get();
  const filtered = hrefs.filter((href) => !href.startsWith("https")).filter((href, i, arr) => arr.indexOf(href) === i);
  
  console.log(filtered)
  return filtered;

};

console.log(getLinks())

