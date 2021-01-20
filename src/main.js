const fs = require("./fs");
const { getOAuthClient, getEmails } = require("./gmail");
const makeSjd = require("./sjd");
const { getXRates } = require("./forex");
const { PROCESSED_PATH, PATTERNS_PATH, SJD_PATH } = require("./const");

const DONE = 1;
const ERROR = 0;
const SKIPPED = -1;

const processPaypalInvoice = async ({ id, date, html }, sjdCredentials) => {
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
  const receivedGBP = received / xrates / 100;
  const flooredReceivedGBP = Math.floor(received / xrates) / 100;
  const feeGBP = fee / xrates / 100;
  console.log({
    id,
    date,
    received: receivedGBP,
    fee: feeGBP,
    rate: xrates,
  });
  const { login, createInvoice, createExpense } = await makeSjd();
  await login(sjdCredentials);
  await createInvoice({ date, amount: flooredReceivedGBP, customerId: 24874 });
  console.log("Created invoice");
  await createExpense({
    date,
    amount: feeGBP,
    typeId: 56,
    name: "paypal fees",
    html,
  });
  console.log("Created expense");
  return DONE;
};

(async () => {
  if (!(await fs.exists(PROCESSED_PATH))) {
    fs.writeFile(PROCESSED_PATH, "[]");
  }
  const processed = JSON.parse(await fs.readFile(PROCESSED_PATH));
  const patterns = JSON.parse(await fs.readFile(PATTERNS_PATH));
  const sjdCredentials = JSON.parse(await fs.readFile(SJD_PATH));
  const auth = await getOAuthClient();
  const emails = await getEmails(auth, patterns, processed);

  for (const email of emails["paypal-invoice"]) {
    const result = await processPaypalInvoice(email, sjdCredentials);
    if ([DONE, SKIPPED].includes(result)) {
      processed.push(email.id);
    }
  }
  processed.sort();
  await fs.writeFile(
    PROCESSED_PATH,
    JSON.stringify([...new Set(processed)], null, "\t")
  );
  process.exit(0);
})();
