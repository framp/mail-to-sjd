const util = require("util");
const readline = require("readline");
const { google } = require("googleapis");
const parseEmail = require("mailparser").simpleParser;
const fs = require("./fs");
const { SCOPES, CREDENTIALS_PATH, TOKEN_PATH } = require("./const");

const getOAuthClient = async () => {
  const credentialsContent = await fs.readFile(CREDENTIALS_PATH);
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
    let messageIds = [];
    let res = null;
    do {
      res = await google.gmail("v1").users.messages.list({
        userId: "me",
        q: filledPattern,
        pageToken: res && res.data.nextPageToken,
      });
      messageIds.push(...(res.data.messages || []).map(({ id }) => id));
    } while (res.data.nextPageToken);
    const emails = [];
    for (const id of messageIds) {
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

module.exports = {
  getOAuthClient,
  getEmails,
};
