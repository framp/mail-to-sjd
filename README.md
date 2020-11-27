# Mail to SJD expenses / invoices

Quick tool to read my company gmail, find company expenses and invoices and import them in my [accountant online system](https://sjdaccountancy.com/).

If you need a UK accountant, I can warmly recommend SJD - feel free to [reach out](mailto:hi@framp.me) if you want an introduction / potentially a discount (depending on their offers).

# How to use

This is not a tool to use out of the box but something you should customize writing code for your own need.

- Set up a GMail application following [these instructions](https://developers.google.com/gmail/api/quickstart/nodejs)
- Copy credentials.json in this directory
- Configure the email patterns and how to process them in main.js
- `npm install`
- `npm start`

# Personal TODOs

- Generate PDFs of HTML emails to attach as receipts
- Make requests to create invoices and expenses on SJD
- Implement invoice creation from Stripe
- Implement expenses creation from Paypal
- Paginate through GMail emails, if needed
