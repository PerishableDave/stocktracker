import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import dotenv from 'dotenv'
import twilio from 'twilio'
import cron from 'node-cron'

dotenv.config()

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH)

puppeteer.use(StealthPlugin)
puppeteer.use(RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: process.env.TWOCAPTCHA
  }
}))

const newPage = async (browser) => {
  const page = await browser.newPage()
  await page.setViewport({width: 1200, height: 800})
  return page
}

const browser = await puppeteer.launch({headless: true})
const microsoftPage = await newPage(browser)
const targetPage = await newPage(browser)

const checkStock = async () => {
  try {
    await checkMicrosoft(microsoftPage)
    await checkTarget(targetPage)
  } catch (err) {
    console.log('ERROR: ')
    console.log(err)
  }
}

//const checkWalmart = async (browser) => {
//  const url = 'https://www.walmart.com/ip/XB1-Xbox-Series-X/443574645'
//  await page.goto(url, {'waitUntil': 'networkidle2'})
//  const { captchas } = await page.solveRecaptchas()
//  
//  if (captchas && captchas.length > 0) {
//    await page.waitForNavigation()
//    await page.waitForSelector('.prod-ProductTitle prod-productTitle-buyBox')
//  }
//
//  const result = await page.$('.prod-ProductOffer-oosMsg')
//  if (!result) {
//    notify(url)
//  }
//}

const checkTarget = async (page) => {
  const url = 'https://www.target.com/p/xbox-series-x-console/-/A-80790841'
  await page.goto(url, {'waitUntil': 'networkidle2'})

  const result = await page.$('[data-test=shipItButton]')
  if (result) {
    log(true, url)
    await notify(url)
  } else {
    log(false, url)
  }
}

const checkMicrosoft = async (page) => {

  const url = 'https://www.xbox.com/en-US/consoles/xbox-series-x#purchase'
  try {
    await page.goto(url, {'waitUntil': 'networkidle2'})

    const result = await page.waitForSelector('[data-bi-name="buy now"]', {timeout: 5000})

    if (result) {
      log(true, url)
      await notify(url)
    }
  } catch (err) {
    log (false, url)
  }
}

const log = (inStock, url) => {
  const date = new Date().toString()
  const stockStr = inStock ? 'INSTOCK' : 'OOS'
  console.log(`${date} ${stockStr} ${url}`)
}

const notify = (url) => {
  return twilioClient.messages.create({
    body: `INSTOCK: ${url}`,
    from: process.env.TWILIO_FROM,
    to: process.env.TWILIO_TO
  })
}

const task = cron.schedule('*/2 * * * *', checkStock, {scheduled: false})
task.start()
