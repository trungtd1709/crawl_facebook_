import dotenv from "dotenv";
import express from "express";
import {
  crawlUrl,
  emailFieldID,
  loginButtonSelector,
  mainDivClassName,
  modalSelector,
  password,
  passwordFieldID,
  postImgSelector,
  replyImgSelector,
  seeMoreSelector,
  spanClickSelector,
  username,
} from "./const.js";
import fs from "fs";
import https from "https";
import { spawn } from 'child_process';
import { createPage } from "./page.js";
dotenv.config();

const filename = "result.txt";
const imagesFolderPath = "./images";
const app = express();
const port = process.env.PORT || 3002;

// const browser = await puppeteer.launch({
//   headless: false,
//   defaultViewport: null,
//   // args: ["--single-process"],
// });
// const page = await browser.newPage();

// await page.setCacheEnabled(false);
// // page.
// await page.setRequestInterception(true);
// page.on("request", (req) => {
//   if (["image", "font"].includes(req.resourceType())) {
//     req.abort();
//   } else {
//     req.continue();
//   }
// });

const page = await createPage();

app.get("/", (req, res) => {
  findAndRemoveElement();
  res.send("continute");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

function delay(time = 3000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const startPage = async () => {
  console.log("Start page");
  try {
    // await page.goto(crawlUrl, { waitUntil: "load" });
    // await page.setViewport({ width: 1080, height: 1024 });
    await createFolder();
    await cleanFile();
    // await closeModal();

    // await autoScroll();
    // await page.waitForNavigation();
    // let crawlElements = await page.$("123");
    // await delay();
    // await login();
    await delay(40000);
    await findAndRemoveElement();
  } catch (err) {
    console.log(err);
    // await closeModal();
    await findAndRemoveElement();
  }
};

const closeModal = async () => {
  // await page.waitForSelector('[aria-label="Close"]', { visible: true });

  const closeButton = await page.$('[aria-label="Close"]');
  if (closeButton) {
    closeButton.click();
    await delay(1000);
  }
};

const login = async () => {
  await delay(5000);
  console.log("[Start login]");

  // await page.waitForSelector(emailFieldID);

  const usenameInput1 = await page.$$("#\\:rn\\:");
  if (usenameInput1.length > 0) {
    await page.type("#\\:rn\\:", username);
  }

  const usenameInput2 = await page.$$("#\\:r4\\:");

  if (usenameInput2.length > 0) {
    await page.type("#\\:r4\\:", username);
  }

  const passwordInput1 = await page.$$("#\\:rq\\:");
  if (passwordInput1.length > 0) {
    await page.type("#\\:rn\\:", password);
  }

  const passwordInput2 = await page.$$("#\\:r7\\:");

  if (passwordInput2.length > 0) {
    await page.type("#\\:r4\\:", password);
  }

  await delay(10000);

  // const usernameInput = page.$$(emailFieldID)
  // await page.type(emailFieldID, username);

  // await page.waitForSelector(passwordFieldID);
  // await page.type(passwordFieldID, password);

  // await page.type(emailFieldID, username);
  // await page.type(passwordFieldID, password);
  // await delay();
  const loginButton = await page.$(loginButtonSelector);
  if (loginButton) {
    console.log("Found the login button");
    // For example, to click the button:
    try {
      // await loginButton.click();
      await page.evaluate((el) => el.click(), loginButton);
      console.log("click success");
    } catch (err) {
      console.log(err);
    }
  } else {
    console.log("Login button not found");
  }
};

const findAndRemoveElement = async () => {
  page.on("console", (msg) => console.log("[PAGE LOG]:", msg.text()));
  console.log("[findAndRemoveElement]");

  await page.evaluate(() => {
    const elements = document.querySelectorAll('[aria-label="Facebook"]');
    elements.forEach((element) => {
      element.parentNode.removeChild(element);
    });
  });

  const crawlElementsSelector = ".x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z";
  let crawlElements = await page.$$(crawlElementsSelector);
  let crawlElementsLength = 1;
  let postIndex = 1;

  while (true) {
    // const context = browser.defaultBrowserContext();
    // await context.clearPermissionOverrides();
    // await context.clearCache();
    outerLoop: for await (let parentEl of crawlElements) {
      await parentEl.evaluate((el) => el.scrollIntoView(), parentEl);
      let spans = await parentEl.$$(spanClickSelector);
      let innerText = "";
      let imgUrl = [];
      for await (let span of spans) {
        const text = await span.evaluate((span) => span.innerText, span);
        if (
          text === "View more answers" ||
          text === "View more comments" ||
          checkStringViewAll(text) ||
          text === "View 1 reply"
        ) {
          if (span) {
            const elementContainsLink = await span.evaluate((element) => {
              const link = element.querySelector("a[href]");
              return !!link;
            });
            if (!elementContainsLink) {
              try {
                await span.click();
                await delay(1000);
                // spans = null;
                break;
              } catch (error) {
                console.error("Click failed", error);
                continue;
              }
            }
          }
        }
      }

      let modalFound = true;

      await page
        .waitForSelector(modalSelector, { timeout: 5000 })
        .catch((e) => {
          console.log("Modal not found or did not appear within 5 seconds");
          modalFound = false;
        });
      if (modalFound) {
        let modal = await page.$(modalSelector);
        if (modal) {
          let spansModal = await modal.$$eval(spanClickSelector, (el) => {
            return el[0].tagName.toLowerCase() === "span";
          });

          for (let i = 0; i < spansModal.length; i++) {
            const spanModal = spansModal[i];
            const spanModalText = await page.evaluate(
              (span) => span.innerText,
              spanModal
            );
            if (
              spanModalText === "View more answers" ||
              spanModalText === "View more comments" ||
              checkStringViewAll(spanModalText) ||
              spanModalText === "View 1 reply"
            ) {
              if (modal && spanModal) {
                await page.evaluate(
                  (el) => el.scrollIntoView(),
                  spanModal
                );
                // await spanModal.click();
                await page.evaluate((el) => el.click(), spanModal);
                // break;
              }
            }
          }
          await delay(3000);
          await clickSeeMore(modal);
          innerText = removeUnnecessaryStrPath(
            await page.evaluate((element) => element.innerText, modal)
          );
          if (innerText === "") {
            console.log("inner text null modal");
          }
          await writeToFile(
            `[Post Index]: ${postIndex}\n----------------- Start Post --------------- \n[Post content]: ${innerText} \n----------------- End Post --------------- \n`
          );

          await getImgUrl(modal, postIndex);
          // console.log("[innerText]:", innerText);
          await closeModal();
          postIndex++;
          // await page.evaluate((el) => el.remove(), parentEl);
          // modal = null;
          // spansModal = null;
          continue outerLoop;
        }
      }

      await clickSeeMore(parentEl);

      innerText = removeUnnecessaryStrPath(
        await page.evaluate((element) => element.innerText, parentEl)
      );
      if (innerText === "") {
        console.log("inner text null no modal");
      }

      await writeToFile(
        `[Post Index]: ${postIndex}\n----------------- Start Post --------------- \n[Post content]: ${innerText} \n----------------- End Post --------------- \n`
      );
      await getImgUrl(parentEl, postIndex);
      // console.log("[innerText]:", innerText);

      postIndex++;
      // await page.evaluate((el) => el.remove(), parentEl);
    }

    await Promise.all(
      crawlElements.map((parentEl) => {
        return page.evaluate((el) => el.remove(), parentEl);
      })
    );

    await delay(5000);
    crawlElements = await page.$$(crawlElementsSelector);
    crawlElementsLength += crawlElements.length;
    console.log("[postindex]: ", postIndex);
  }
  console.log("[EXIT LOOP]");
};

async function autoScroll() {
  console.log("[AutoScroll]");
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 100;

      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

const getImgUrl = async (parentEl, postIndex) => {
  let postImages = await parentEl.$$(postImgSelector);
  let replyImages = await parentEl.$$(replyImgSelector);

  const postImagesUrl = await Promise.all(
    postImages.map(async (img) => {
      const src = await img.getProperty("src");
      return src.jsonValue();
    })
  );
  postImages = null;

  const replyImagesUrl = await Promise.all(
    replyImages.map(async (img) => {
      const srcProperty = await img.getProperty("src");
      const src = await srcProperty.jsonValue(); // Convert to string
      if (!src.includes("emoji") && !src.includes("static.xx")) {
        return src; // Return src only if it does not contain "emoji"
      }
      return null; // Return null if it contains "emoji"
    })
  );
  replyImages = null;

  const filteredReplyImagesUrl = replyImagesUrl.filter((url) => url !== null);
  const filteredPostImagesUrl = postImagesUrl.filter((url) => url !== null);

  await createFolder(postIndex);
  const basePath = `./images/${postIndex}`;

  for (let i = 0; i < filteredPostImagesUrl.length; i++) {
    const img = filteredPostImagesUrl[i];
    if (img) {
      const fullImgPath = `${basePath}/post_img_${i}.png`;
      await downloadImageAsync(img, fullImgPath);
    }
  }

  for (let i = 0; i < filteredReplyImagesUrl.length; i++) {
    const img = filteredReplyImagesUrl[i];
    if (img) {
      const fullImgPath = `${basePath}/reply_img_${i}.png`;
      await downloadImageAsync(img, fullImgPath);
    }
  }

  return;
};

async function writeToFile(content) {
  fs.appendFile(filename, `${content}\n`, "utf8", (error) => {
    if (error) {
      console.error("Error writing file:", error);
    } else {
      console.log("File written successfully");
    }
  });
}

async function cleanFile() {
  fs.writeFile(filename, ``, "utf8", (error) => {
    if (error) {
      console.error("Error writing file:", error);
    } else {
      console.log("File written successfully");
    }
  });
}

const removeUnnecessaryStrPath = (original) => {
  let text = original;
  text = text.replace(/All reactions:/g, "");
  text = text.replace(/Like/g, "");
  text = text.replace(/Top comments/g, "");
  text = text.replace(/Comment/g, "");
  text = text.replace(/Reply/g, "");
  text = text.replace(/Share/g, "");
  text = text.replace(/Edited/g, "");
  text = text.replace(/Write an answer…/g, "");
  text = text.replace(/Write a public comment…/g, "");
  text = text.replace(/\b\d+\s+shares?\b/gi, "");

  text = text.replace(/\d+\s+comments?/g, "");
  text = text.replace(/^\s*\d+\s*$/gm, "");

  // Step 2: Remove all time indicators like "10 w", "1 w", "1 y", "1h"
  text = text.replace(/\b\d+\s+[wmyhd]\b/g, "");
  text = text.replace(/\b\d+\s*[wmyhd]\b/g, "");

  // Replace three or more consecutive newline sequences with just two
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
};

const clickViewComment = async (parentEl) => {
  const viewCommentEls = await parentEl.$$(spanClickSelector);
  for (const div of viewCommentEls) {
    const isMoreComment = await parentEl.evaluate((el) => {
      // Function to check if the text matches "View all [number] replies"
      function checkStringViewAll(str) {
        const regex = /^View all \d+ replies$/;
        return regex.test(str);
      }

      // Evaluate the text content of the element against multiple conditions
      return (
        // el.textContent === "View more answers" ||
        // el.textContent === "View more comments" ||
        checkStringViewAll(el.textContent) || // Use the checkStringViewAll function
        el.textContent == "View 1 reply"
      );
    }, div);
    if (isMoreComment) {
      // Scroll the div into view

      // await delay(500);

      try {
        const elementContainsLink = await div.evaluate((element) => {
          const link = element.querySelector("a[href]");
          return !!link;
        });
        if (!elementContainsLink) {
          await div.evaluate((el) => el.scrollIntoView(), div);
          await div.click();
          // await delay(1000);
          // break;
        }
      } catch (error) {}
    }
  }
  await delay(1000);
};

const downloadImage = (url, path) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // Check if the request was successful
        if (res.statusCode === 200) {
          // Pipe the image data to a file
          const writeStream = fs.createWriteStream(path);
          res.pipe(writeStream);

          writeStream.on("finish", () => {
            writeStream.close();
            console.log("Download and save completed.");
            resolve();
          });
        } else {
          reject(
            new Error(
              `Failed to download image. Status code: ${res.statusCode}`
            )
          );
        }
      })
      .on("error", (err) => {
        reject(err);
      });
  });

async function downloadImageAsync(url, path) {
  try {
    await downloadImage(url, path);
    console.log("Image successfully downloaded and saved to", path);
    // Proceed with any other logic after successful download
  } catch (error) {
    console.error("Error downloading the image:", error.message);
    // Handle errors, like logging them or falling back to alternative logic
  }
}

const createFolder = (postIndex) => {
  try {
    let folderPath = "";
    if (postIndex) {
      folderPath = `./images/${postIndex}`;
    } else {
      folderPath = "./images";
    }

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
      console.log("Folder created successfully.");
    } else {
      console.log("Folder already exists.");
    }
  } catch (err) {
    console.error("Error creating folder:", err);
  }
};

const clickSeeMore = async (parentEl) => {
  let seeMoreDivs = await parentEl.$$(seeMoreSelector);
  for await (const div of seeMoreDivs) {
    const isSeeMore = await div.evaluate(
      // (el) => el.textContent.trim() === "See more",
      (el) => el.textContent === "See more",
      div
    );
    if (isSeeMore) {
      // Scroll the div into view
      await div.evaluate((el) => el.scrollIntoView(), div);
      // await delay(500);
      const elementContainsLink = await div.evaluate((element) => {
        const link = element.querySelector("a[href]");
        return !!link;
      });
      if (!elementContainsLink) {
        try {
          // await div.click();
          await div.evaluate((el) => el.click(), div);
          // await parentEl.evaluate((el) => el.click(), div);
        } catch (error) {
          await parentEl.evaluate((el) => el.click(), div);
        }
      }
    }
  }
  // seeMoreDivs = null;
  await delay(1000);
};
function checkStringViewAll(str) {
  const regex = /^View all \d+ replies$/;
  return regex.test(str);
}

await startPage();
