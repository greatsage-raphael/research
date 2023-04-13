import puppeteer from "puppeteer";

const BASE_URL = "http://www.kenyalaw.org:8181/exist/kenyalex/actview.xql?actid=No.%2031%20of%202016";

const url = "http://www.kenyalaw.org:8181/exist/"

const getLinks = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(BASE_URL);
  
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

console.log(getLinks());