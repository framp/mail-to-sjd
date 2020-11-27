const fs = require("./fs");
const { getOAuthClient, getEmails } = require("./gmail");
const { getXRates } = require("./forex");
const { PROCESSED_PATH, PATTERNS_PATH } = require("./const");

const DONE = 1;
const ERROR = 0;
const SKIPPED = -1;

const processPaypalInvoice = async ({ id, date, html }) => {
  if (!html.match("R Software Inc. sent you")) {
    console.log(
      `${id} ${date.toISOString()}: Not an invoice from R Software, skipping`
    );
    return SKIPPED;
  }

  const [received, fee, total] = [
    ...html.matchAll(/\$([0-9.]*)(&nbsp;|\s*)USD/g),
  ]
    .map((match) => +match[1].replace(".", ""))
    .slice(-3);
  const numberMatch = received - fee === total;
  if (!numberMatch) {
    console.error(
      `${id} ${date.toISOString()}: Numbers don't match, ${received} - ${fee} !== ${total}`
    );
    return ERROR;
  }

  const xrates = await getXRates(date, "GBP", "USD");
  console.log({
    date,
    received: received / xrates / 100,
    fee: fee / xrates / 100,
    rate: xrates,
  });
  return DONE;
};

(async () => {
  const processed = JSON.parse(await fs.readFile(PROCESSED_PATH));
  const patterns = JSON.parse(await fs.readFile(PATTERNS_PATH));
  const auth = await getOAuthClient();
  const emails = await getEmails(auth, patterns, processed);

  for (const email of emails["paypal-invoice"]) {
    const result = await processPaypalInvoice(email);
    if ([DONE, SKIPPED].includes(result)) {
      processed.push(email.id);
    }
  }
  processed.sort();
  await fs.writeFile(PROCESSED_PATH, JSON.stringify([...new Set(processed)]));
})();
