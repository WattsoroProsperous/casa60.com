const puppeteer = require('puppeteer');
const path = require('path');

async function generatePDF() {
    const browser = await puppeteer.launch({
        headless: 'new'
    });

    const page = await browser.newPage();

    const htmlPath = path.join(__dirname, 'menu.html');
    await page.goto(`file://${htmlPath}`, {
        waitUntil: 'networkidle0'
    });

    await page.pdf({
        path: path.join(__dirname, 'menu-casa60.pdf'),
        format: 'A4',
        printBackground: true,
        margin: {
            top: '0',
            right: '0',
            bottom: '0',
            left: '0'
        }
    });

    console.log('PDF generated successfully: menu-casa60.pdf');

    await browser.close();
}

generatePDF().catch(console.error);
