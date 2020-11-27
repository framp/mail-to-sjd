const fs = require("fs");
const request = require("request-promise");

const getHMRCMonth = (date) =>
  (date.getMonth() < 9 ? "0" : "") +
  [date.getMonth() + 1, date.getYear() % 100].join("");
const hmrcBasePage = (year) =>
  `https://www.gov.uk/government/publications/hmrc-exchange-rates-for-${year}-monthly`;
const getHMRCMonthlyExchange = async (dates, currency) => {
  const months = [...new Set(dates.map(getHMRCMonth))];
  console.log(months);
  const years = [...new Set(data.map(({ date }) => date.getFullYear()))];
  const basePages = await Promise.all(
    years.map((year) => request(hmrcBasePage(year)))
  );
  const links = Object.fromEntries(
    [].concat(
      ...basePages.map((content) =>
        [
          ...content.matchAll(/https:\/\/.*exrates-monthly-([0-9]+).csv/g),
        ].map(([match, month]) => [month, match])
      )
    )
  );
  console.log(links);
  const detailPages = await Promise.all(
    months.map(async (month) => [month, await request(links[month])])
  );
  return Object.fromEntries(
    detailPages.map(([month, page]) => [
      month,
      page
        .split("\n")
        .map((line) => line.split(","))
        .find((row) => row[2] === currency)[3],
    ])
  );
};

const getXRates = async (date, fromCurrency, toCurrency) => {
  const page = await request(
    `https://www.x-rates.com/historical/?from=${fromCurrency}&to=${toCurrency}&amount=1&date=${
      date.toISOString().split("T")[0]
    }`
  );
  return page.match(
    new RegExp(`from=${fromCurrency}&amp;to=${toCurrency}'>([0-9.]+)<`)
  )[1];
};

const getDataFromHtml = (path = ".") =>
  fs
    .readdirSync(path)
    .filter((name) => name.match(/html$/))
    .map((name) => [name, fs.readFileSync("./" + name).toString()])
    .filter(([name, content]) => content.match("R Software Inc. sent you"))
    .map(([name, content]) => {
      const date = new Date(name.split("T")[0]);
      const [received, fee, total] = [
        ...content.matchAll(/\$([0-9.]*)(&nbsp;|\s*)USD/g),
      ]
        .map((match) => +match[1].replace(".", ""))
        .slice(-3);
      const numberMatch = received - fee === total;

      return { name, date, amounts: { received, fee, total }, numberMatch };
    });

(async () => {
  const data = getDataFromHtml();
  const hmrcExchange = {
    1020: "1.2763",
    1120: "1.3163",
    "0820": "1.2732",
    "0920": "1.3184",
  }; //await getHMRCMonthlyExchange(data.map(({date}) => date), "USD");
  const forexData = await Promise.all(
    data.map(async (row) => {
      const hmrc = hmrcExchange[getHMRCMonth(row.date)];
      const xrates = await getXRates(row.date, "GBP", "USD");
      return {
        ...row,
        rates: { hmrc, xrates },
        originalAmounts: {
          received: row.amounts.received / 100,
          fee: row.amounts.fee / 100,
          total: row.amounts.total / 100,
        },
        hmrcAmounts: {
          received: row.amounts.received / hmrc / 100,
          fee: row.amounts.fee / hmrc / 100,
          total: row.amounts.total / hmrc / 100,
        },
        xratesAmounts: {
          received: row.amounts.received / xrates / 100,
          fee: row.amounts.fee / xrates / 100,
          total: row.amounts.total / xrates / 100,
        },
      };
    })
  );
  console.log(forexData);
  const sum = forexData.reduce(
    (acc, row) => ({
      hmrc: acc.hmrc + row.hmrcAmounts.total,
      xrates: acc.xrates + row.xratesAmounts.total,
    }),
    { hmrc: 0, xrates: 0 }
  );
  console.log(sum);
  const xratesData = forexData.map(
    ({ date, xratesAmounts: { received, fee } }) => ({
      date,
      received,
      fee,
    })
  );
  console.log(xratesData);
})();
