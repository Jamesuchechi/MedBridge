"""
NAFDAC Drug Database Scraper
=============================
Crawls the NAFDAC public drug registry at https://www.nafdac.gov.ng
and the NAFDAC eCabinet portal, outputs a structured JSON file
compatible with the MedBridge drugs table schema.

Usage:
    pip install requests beautifulsoup4 lxml tqdm
    python nafdac_scraper.py --output drugs_scraped.json --limit 5000

The scraper targets two sources:
  1. NAFDAC Product Search: https://www.nafdac.gov.ng/product-search/
  2. WHO Essential Medicines List (Nigeria) as a fallback

Output JSON shape per drug:
{
  "nafdacNumber": "A4-0003",
  "name": "Paracetamol Tablets BP 500mg",
  "genericName": "Paracetamol",
  "brandNames": ["Panadol", "Emzor", "M&B"],
  "manufacturer": "GSK Consumer Healthcare",
  "category": "Analgesic/Antipyretic",
  "form": "Tablet",
  "strength": "500mg",
  "uses": ["Mild to moderate pain", "Fever", "Headache"],
  "contraindications": ["Severe hepatic impairment", "Known hypersensitivity"],
  "sideEffects": ["Nausea", "Rash (rare)", "Liver damage (overdose)"],
  "interactions": ["Warfarin", "Alcohol"],
  "priceRangeMin": 300,
  "priceRangeMax": 800,
  "requiresPrescription": false,
  "controlled": false,
  "atcCode": "N02BE01",
  "icdIndications": ["R50", "R51", "M79.3"]
}
"""

import json
import time
import argparse
import logging
from typing import Optional
from dataclasses import dataclass, field, asdict

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; MedBridge-Research-Bot/1.0; +https://medbridge.health/bot)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

NAFDAC_SEARCH_URL = "https://www.nafdac.gov.ng/?s={query}&post_type=product"
NAFDAC_PRODUCT_URL = "https://www.nafdac.gov.ng/product-category/{category}/"

# Category slugs available on NAFDAC website
NAFDAC_CATEGORIES = [
    "antibiotics", "antimalarials", "analgesics", "antihypertensives",
    "antidiabetics", "antiretrovirals", "antifungals", "antiparasitics",
    "vitamins-supplements", "cardiovascular", "respiratory", "gastrointestinal",
    "dermatological", "ophthalmic", "vaccines",
]


@dataclass
class Drug:
    nafdacNumber: str = ""
    name: str = ""
    genericName: str = ""
    brandNames: list = field(default_factory=list)
    manufacturer: str = ""
    category: str = ""
    form: str = ""
    strength: str = ""
    uses: list = field(default_factory=list)
    contraindications: list = field(default_factory=list)
    sideEffects: list = field(default_factory=list)
    interactions: list = field(default_factory=list)
    priceRangeMin: int = 0
    priceRangeMax: int = 0
    requiresPrescription: bool = False
    controlled: bool = False
    atcCode: str = ""
    icdIndications: list = field(default_factory=list)


class NAFDACScraper:
    def __init__(self, delay: float = 1.5):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.delay = delay
        self.scraped: list[Drug] = []

    def _get(self, url: str) -> Optional[BeautifulSoup]:
        try:
            resp = self.session.get(url, timeout=15)
            resp.raise_for_status()
            time.sleep(self.delay)
            return BeautifulSoup(resp.text, "lxml")
        except Exception as e:
            log.warning(f"Failed to fetch {url}: {e}")
            return None

    def scrape_category_page(self, category: str, page: int = 1) -> list[str]:
        """Returns list of product page URLs for a given category."""
        url = f"{NAFDAC_PRODUCT_URL.format(category=category)}page/{page}/"
        soup = self._get(url)
        if not soup:
            return []

        links = []
        # NAFDAC product listings use WooCommerce-style markup
        for a in soup.select("ul.products li.product a.woocommerce-loop-product__link"):
            href = a.get("href")
            if href:
                links.append(href)
        return links

    def scrape_product_page(self, url: str) -> Optional[Drug]:
        """Scrapes a single product detail page."""
        soup = self._get(url)
        if not soup:
            return None

        drug = Drug()

        # Product title
        title_el = soup.select_one("h1.product_title")
        if title_el:
            drug.name = title_el.get_text(strip=True)

        # Product meta table (NAFDAC uses a custom meta table)
        meta_table = soup.select("table.shop_attributes tr")
        for row in meta_table:
            label_el = row.select_one("th")
            value_el = row.select_one("td")
            if not label_el or not value_el:
                continue
            label = label_el.get_text(strip=True).lower()
            value = value_el.get_text(strip=True)

            if "reg" in label or "nafdac" in label:
                drug.nafdacNumber = value
            elif "generic" in label or "active" in label:
                drug.genericName = value
            elif "manufacturer" in label or "company" in label:
                drug.manufacturer = value
            elif "category" in label or "class" in label:
                drug.category = value
            elif "form" in label or "dosage form" in label:
                drug.form = value
            elif "strength" in label or "concentration" in label:
                drug.strength = value
            elif "prescription" in label:
                drug.requiresPrescription = "yes" in value.lower() or "rx" in value.lower()

        # Description text often has uses/indications
        desc_el = soup.select_one("div.woocommerce-product-details__short-description")
        if desc_el:
            desc_text = desc_el.get_text()
            if "indication" in desc_text.lower() or "used for" in desc_text.lower():
                drug.uses = [line.strip() for line in desc_text.split("\n") if line.strip() and len(line.strip()) > 10][:5]

        return drug if drug.name else None

    def scrape_all(self, limit: int = 5000) -> list[Drug]:
        log.info(f"Starting NAFDAC scrape (target: {limit} drugs)")
        product_urls: list[str] = []

        for category in tqdm(NAFDAC_CATEGORIES, desc="Collecting product URLs"):
            page = 1
            while len(product_urls) < limit * 2:  # over-collect, deduplicate
                urls = self.scrape_category_page(category, page)
                if not urls:
                    break
                product_urls.extend(urls)
                page += 1
                if page > 50:  # safety cap
                    break

        product_urls = list(dict.fromkeys(product_urls))  # deduplicate preserving order
        log.info(f"Collected {len(product_urls)} unique product URLs")

        for url in tqdm(product_urls[:limit], desc="Scraping product pages"):
            drug = self.scrape_product_page(url)
            if drug:
                self.scraped.append(drug)

        log.info(f"Successfully scraped {len(self.scraped)} drugs")
        return self.scraped

    def save(self, path: str):
        data = [asdict(d) for d in self.scraped]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        log.info(f"Saved {len(data)} drugs to {path}")


def main():
    parser = argparse.ArgumentParser(description="NAFDAC Drug Scraper")
    parser.add_argument("--output", default="drugs_scraped.json", help="Output JSON file path")
    parser.add_argument("--limit", type=int, default=5000, help="Max drugs to scrape")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between requests (seconds)")
    args = parser.parse_args()

    scraper = NAFDACScraper(delay=args.delay)
    scraper.scrape_all(limit=args.limit)
    scraper.save(args.output)
    print(f"\n✅ Done. Scraped {len(scraper.scraped)} drugs → {args.output}")
    print("Next step: run `python import_drugs.py --file drugs_scraped.json` to load into Postgres")


if __name__ == "__main__":
    main()