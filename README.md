# Mail to SJD expenses / invoices

Quick tool to read my company gmail, find company expenses and invoices and import them in my [accountant online system](https://sjdaccountancy.com/).

If you need a UK accountant, I can warmly recommend SJD - feel free to [reach out](mailto:hi@framp.me) if you want an introduction / potentially a discount (depending on their offers).

# How to use

This is not a tool to use out of the box but something you should customize writing code for your own need.

- Fork this repo
- Set up a GMail application following [these instructions](https://developers.google.com/gmail/api/quickstart/nodejs)
- Copy credentials.json in `./data/credentials.json`
- Setup your sjd credentials
- `echo '{ "username": "", "password": "..." }' > ./data/sjd.json`
- Configure the email patterns in patterns.json, eg:
- `echo '{"paypal-invoice": "from:(service@paypal.co.uk) subject:(You've got money) before:{DATE}"}' > ./data/patterns.json`
- Write the code to process the emails in `main.js`
- `npm install`
- `npm start`

# Personal TODOs

- Implement invoice creation from Stripe
