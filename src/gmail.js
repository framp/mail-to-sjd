const util = require("util");
const readline = require("readline");
const { google } = require("googleapis");
const parseEmail = require("mailparser").simpleParser;
const puppeteer = require("puppeteer");
const fs = require("./fs");
const { SCOPES, TOKEN_PATH } = require("./const");

const getOAuthClient = async () => {
  const credentialsContent = await fs.readFile("credentials.json");
  const credentials = JSON.parse(credentialsContent);
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  let token;
  try {
    const tokenContent = await fs.readFile(TOKEN_PATH);
    token = JSON.parse(tokenContent);
  } catch (err) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const userCode = await new Promise((res) =>
      rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        res(code);
      })
    );
    token = await util
      .promisify(oAuth2Client.getToken)
      .call(oAuth2Client, userCode);
    await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log("Token stored to", TOKEN_PATH);
  }
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
};

const fillPattern = (pattern) =>
  pattern.replace(/\{DATE\}/g, new Date().toISOString().split("T")[0]);

const getEmails = async (auth, patterns, processed) => {
  google.options({ auth });
  const results = {};
  for (const pattern of Object.keys(patterns)) {
    const filledPattern = fillPattern(patterns[pattern]);
    const res = await google
      .gmail("v1")
      .users.messages.list({ userId: "me", q: filledPattern });
    const emails = [];
    for (const { id } of res.data.messages) {
      if (processed.includes(id)) continue;
      const res = await google
        .gmail("v1")
        .users.messages.get({ id, userId: "me", format: "raw" });
      const email = await parseEmail(
        Buffer.from(res.data.raw, "base64").toString()
      );
      emails.push({ id, date: email.date, html: email.html });
    }
    results[pattern] = emails;
  }
  return results;
};

const renderEmail = async (html) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({ path: "expense.pdf", format: "A4" });
  await browser.close();
};

module.exports = {
  getOAuthClient,
  getEmails,
  renderEmail,
};
