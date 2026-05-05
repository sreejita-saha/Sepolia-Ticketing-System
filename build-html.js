/**
 * build-html.js
 * Templating script that injects page content into base layout.
 * Generates final HTML files from page templates.
 *
 * Usage: node build-html.js
 *
 * Source: frontend/pages/*.html (page content only)
 * Layout: frontend/layouts/base.html (template with {{placeholders}})
 * Output: frontend/*.html (final pages)
 */

const fs = require("fs");
const path = require("path");

const LAYOUTS_DIR = path.join(__dirname, "frontend", "layouts");
const PAGES_DIR = path.join(__dirname, "frontend", "pages");
const OUTPUT_DIR = path.join(__dirname, "frontend");
const BASE_LAYOUT = fs.readFileSync(path.join(LAYOUTS_DIR, "base.html"), "utf-8");

/**
 * Page definitions: each page specifies its content file, title, nav active state, and extra files.
 */
const PAGES = [
  {
    name: "index",
    title: "Events",
    nav_active: "nav_events",
    content_file: "index.html",
    additional_styles: "",
    scripts: '<script src="js/pages/index.js"></script>',
  },
  {
    name: "create-wallet",
    title: "Create Wallet",
    nav_active: "nav_create_wallet",
    content_file: "create-wallet.html",
    additional_styles: '<link rel="stylesheet" href="css/pages/create-wallet.css" />',
    scripts: '<script src="js/pages/create-wallet.js"></script>',
  },
  {
    name: "balance",
    title: "My Tickets",
    nav_active: "nav_balance",
    content_file: "balance.html",
    additional_styles: '<link rel="stylesheet" href="css/pages/balance.css" />',
    scripts: '<script src="js/utils.js"></script>\n  <script src="js/config.js"></script>\n  <script src="js/pages/balance.js"></script>',
  },
  {
    name: "buy",
    title: "Buy Tickets",
    nav_active: "nav_buy",
    content_file: "buy.html",
    additional_styles: '<link rel="stylesheet" href="css/pages/buy.css" />',
    scripts:
      '<script src="https://cdn.jsdelivr.net/npm/web3@1.10.4/dist/web3.min.js" integrity="sha384-ulu2XS1P+kSni6pddyZyDGmNiztg1R9ziuOn0U+RtEoVB46ekZ9MLOzruBMtXjQQ" crossorigin="anonymous"></script>\n  <script src="js/utils.js"></script>\n  <script src="js/config.js"></script>\n  <script src="js/pages/buy.js"></script>',
  },
  {
    name: "transfer",
    title: "Transfer",
    nav_active: "nav_transfer",
    content_file: "transfer.html",
    additional_styles: '<link rel="stylesheet" href="css/pages/transfer.css" />',
    scripts:
      '<script src="https://cdn.jsdelivr.net/npm/web3@1.10.4/dist/web3.min.js" integrity="sha384-ulu2XS1P+kSni6pddyZyDGmNiztg1R9ziuOn0U+RtEoVB46ekZ9MLOzruBMtXjQQ" crossorigin="anonymous"></script>\n  <script src="js/utils.js"></script>\n  <script src="js/config.js"></script>\n  <script src="js/pages/transfer.js"></script>',
  },
];

/**
 * Renders a page by substituting template placeholders with page content.
 * @param {string} pageTemplate Base layout HTML
 * @param {object} page Page configuration
 * @returns {string} Final HTML
 */
function renderPage(pageTemplate, page) {
  const contentPath = path.join(PAGES_DIR, page.content_file);
  let content = "";

  if (fs.existsSync(contentPath)) {
    content = fs.readFileSync(contentPath, "utf-8");
  } else {
    console.warn(`⚠️  Content file not found: ${contentPath}`);
  }

  // Build nav active states
  let html = pageTemplate;
  html = html.replace(/{{title}}/g, page.title);
  html = html.replace(/{{additionalStyles}}/g, page.additional_styles);
  html = html.replace(/{{scripts}}/g, page.scripts);
  html = html.replace(/{{content}}/g, content);

  // Set nav active state for all nav links
  PAGES.forEach((p) => {
    const placeholder = `{{${p.nav_active}}}`;
    const isActive = p.nav_active === page.nav_active ? "nav-active" : "";
    html = html.replace(new RegExp(placeholder, "g"), isActive);
  });

  return html;
}

/**
 * Main build function: process all pages and write output files.
 */
function build() {
  console.log("🏗️  Building HTML pages from templates...\n");

  PAGES.forEach((page) => {
    const html = renderPage(BASE_LAYOUT, page);
    const outputPath = path.join(OUTPUT_DIR, `${page.name}.html`);

    fs.writeFileSync(outputPath, html, "utf-8");
    console.log(`✓ ${page.name}.html`);
  });

  console.log("\n✅ Build complete!");
}

build();
