const puppeteer = require("puppeteer");
const fs = require("./fs");

const renderPDF = (browser) => async (html, path) => {
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ path, format: "A4" });
  await page.close();
  return pdf;
};

const login = (browser) => async (credentials) => {
  const page = await browser.newPage();
  await page.goto("https://online.sjdaccountancy.com/system/login");
  const emailInput = await page.$("[type=email]");
  const passwordInput = await page.$("[type=password]");
  const submitInput = await page.$("[type=submit]");
  await emailInput.type(credentials.username);
  await passwordInput.type(credentials.password);
  await submitInput.click();
  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
  await page.close();
};
const createInvoice = (browser) => async ({
  quantity = 1,
  amount,
  customerId,
  date,
}) => {
  const page = await browser.newPage();
  await page.goto("https://online.sjdaccountancy.com/income");
  const lastInvoiceRef = await (
    await page.$("tr:first-child>td:first-child")
  ).evaluate((node) => node.innerText);
  await page.goto("https://online.sjdaccountancy.com/income/invoice/form");
  await page.evaluate(
    (date, ref, customer, quantity, amount) => {
      document.querySelector("[name=bk_date]").value = date;
      document.querySelector("[name=bk_autoref]").value = ref;
      document.querySelector("[name=bk_acurn]").value = customer;
      document.querySelector("[name=bkline_qty\\[\\]]").value = quantity;
      document.querySelector("[name=bkline_rate\\[\\]]").value = amount;
    },
    date.toLocaleDateString("en-GB"),
    (parseInt(lastInvoiceRef) + 1).toString(),
    customerId.toString(),
    quantity.toString(),
    amount.toFixed(2)
  );
  const submitInput = await page.$("[name=btn_create_final]");
  await submitInput.click();
  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
  await page.close();
};
const createExpense = (browser) => async ({
  name,
  amount,
  typeId,
  date,
  html,
}) => {
  const path = `expense-${date.toISOString()}.pdf`;
  await renderPDF(browser)(html, path);
  const page = await browser.newPage();
  await page.goto("https://online.sjdaccountancy.com/expenses/expense/form");
  await page.evaluate(
    (date, name, type, amount) => {
      document.querySelector("[name=bk_date]").value = date;
      document.querySelector("[name=bk_ref]").value = name;
      document.querySelector("[name=bkline_gtrans_urn\\[\\]]").value = type;
      document.querySelector("[name=bkline_date\\[\\]]").value = date;
      document.querySelector("[name=bkline_gross\\[\\]]").value = amount;
    },
    date.toLocaleDateString("en-GB"),
    name,
    typeId.toString(),
    amount.toFixed(2)
  );
  const [fileInput] = await Promise.all([
    page.waitForFileChooser(),
    page.click("[name=btn_file_line]"),
  ]);
  await fileInput.accept([path]);
  await page.waitForTimeout(4000);
  const submitInput = await page.$("[name=btn_create_final]");
  await submitInput.click();
  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
  await page.close();
  await fs.unlink(path);
};

module.exports = async () => {
  const browser = await puppeteer.launch();
  return {
    login: login(browser),
    createInvoice: createInvoice(browser),
    createExpense: createExpense(browser),
  };
};
