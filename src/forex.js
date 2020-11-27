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

module.exports = {
  getHMRCMonthlyExchange,
  getXRates,
};
