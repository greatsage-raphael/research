import puppeteer from "puppeteer";

const BASE_URL = "http://www.kenyalaw.org:8181/exist/kenyalex/actview.xql?actid=No.%2031%20of%202016";

const getPdfLink = async () =>{
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(BASE_URL);

  const links = await page.$$eval("tbody a", (elements) => 
    elements.map(el => el.href)
  );
  
  // filter for the link that ends with ".pdf"
  const pdfLink = links.find(link => link.endsWith('.pdf') && link.includes('docs'));

  await browser.close();
  console.log(pdfLink)

  return pdfLink

}

const getParagraphs = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(BASE_URL);

  const actTitleText = await page.$eval("tbody div.act-title", el => el.textContent);
  const actTitle = actTitleText.split(':')[1].trim();

  const contentCell = await page.$eval("#contentCell", (el) => el.innerHTML);
  const paragraphsString = contentCell.replace(/<[^>]*>?/gm, "\n").trim();
  const lines = paragraphsString.split("\n").filter((line) => line.trim() !== "");

  const sectionText = lines.join(" ")

  const pdf = pdfLink()


  
  await browser.close();
   
  const section = {
    act_title: actTitle,
    PDFLink: pdf,
    section_num: 0, // handled in embed.ts
    content: sectionText,
    content_length: sectionText.length,
    chunks: []
  };
  console.log(section)

  return section;

};

console.log(getParagraphs());