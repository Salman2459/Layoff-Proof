import moment from "moment";
import express from "express";
import { scheduleJob } from "node-schedule";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicMessagesCreateWithRetry } from "../anthropicRetry";
import RssParser from "rss-parser";
import { db } from "../db";
import { layoffs } from "@shared/schema";
import { and, eq } from "drizzle-orm";

const router = express.Router();
const rssParser = new RssParser();

// Track if scheduler is running to prevent overlaps
let isRunning = false;

interface LayoffData {
    company: string;
    date: string;
    employees_laid_off: number | null;
    source: string;
    location: string | null;
    industry: string;
    details: string;
    is_upcoming?: boolean; // NEW: Flag for upcoming layoffs
}

// Main function to fetch and save layoff data
async function fetchAndSaveLayoffs() {
    if (isRunning) {
        console.log("Previous job still running, skipping...");
        return;
    }

    isRunning = true;
    console.log(`[${new Date().toISOString()}] Starting layoff data fetch...`);

    try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY;

        let allLayoffs: LayoffData[] = [];

        // ✅ ALL CATEGORIES TO SCRAPE
        const categories = [
            "tech",
            "retail",
            "finance",
            "healthcare",
            "manufacturing",
            "automotive",
            "media",
            // "hospitality",
            // "real-estate",
            // "education",
            // "transportation",
            // "energy",
            // "telecommunications",
            // "consulting",
            "other"
        ];

        for (const category of categories) {
            console.log(`\n📊 Processing category: ${category.toUpperCase()}`);

            // ✅ 1. SCRAPE LAYOFFS.FYI (only for first iteration to avoid duplicates)
            if (category === "tech") {
                console.log("Scraping layoffs.fyi...");
                try {
                    const layoffsFyiUrl = `https://api.scrapingdog.com/scrape?api_key=${SCRAPINGDOG_API_KEY}&url=${encodeURIComponent(
                        "https://layoffs.fyi/"
                    )}&dynamic=true`;
                    const response = await fetch(layoffsFyiUrl);

                    if (response.ok) {
                        const html = await response.text();
                        const tableRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
                        const rows = html.match(tableRegex) || [];

                        for (const row of rows) {
                            const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

                            if (cells.length >= 4) {
                                const company = cells[0]?.replace(/<[^>]+>/g, "").trim();
                                const employees = cells[1]?.replace(/<[^>]+>/g, "").trim();
                                const date = cells[2]?.replace(/<[^>]+>/g, "").trim();
                                const location = cells[3]?.replace(/<[^>]+>/g, "").trim();

                                if (company && company !== "Company" && company.length > 1) {
                                    allLayoffs.push({
                                        company,
                                        date: date || new Date().toISOString(),
                                        employees_laid_off: employees ? parseInt(employees.replace(/,/g, "")) : null,
                                        source: "https://layoffs.fyi/",
                                        location: location || null,
                                        industry: "tech",
                                        details: `Layoff tracked by layoffs.fyi`,
                                        is_upcoming: false,
                                    });
                                }
                            }
                        }
                        console.log(`✓ Layoffs.fyi: Found ${allLayoffs.length} entries`);
                    }
                } catch (err: any) {
                    console.error("Layoffs.fyi error:", err.message);
                }
            }

            // ✅ 2. FETCH RSS FEEDS BY CATEGORY
            console.log(`Fetching ${category} news articles...`);

            const categoryFeeds: { [key: string]: string[] } = {
                tech: [
                    "https://techcrunch.com/tag/layoffs/feed/",
                    "https://www.theverge.com/rss/index.xml",
                    "https://feeds.arstechnica.com/arstechnica/index",
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                ],
                retail: [
                    "https://www.retaildive.com/feeds/news/",
                    "https://www.modernretail.co/feed/",
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml"
                ],
                finance: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                    "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
                ],
                healthcare: [
                    "https://www.biopharmadive.com/feeds/news/",
                    "https://www.healthcaredive.com/feeds/news/",
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                ],
                manufacturing: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                    "https://www.manufacturingdive.com/feeds/news/",
                ],
                automotive: [
                    "https://www.autonews.com/rss/all",
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ],
                media: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ],
                hospitality: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ],
                "real-estate": [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ],
                education: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ],
                transportation: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ],
                energy: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ],
                telecommunications: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ],
                consulting: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
                ],
                other: [
                    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
                    "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
                    "https://feeds.bbci.co.uk/news/business/rss.xml",
                ]
            };

            const selectedFeeds = categoryFeeds[category] || categoryFeeds.other;

            // UPDATED: Include keywords for upcoming/planned layoffs
            const keywords = [
                "layoff",
                "laid off",
                "job cut",
                "workforce reduction",
                "redundancies",
                "downsizing",
                "restructuring",
                "firing",
                "plans to cut", // NEW
                "will lay off", // NEW
                "announcing layoffs", // NEW
                "planned layoffs", // NEW
                "upcoming cuts", // NEW
            ];

            const articles: any[] = [];
            await Promise.all(
                selectedFeeds.map(async (url) => {
                    try {
                        const feed = await rssParser.parseURL(url);
                        const relevantArticles = feed.items
                            .filter((item) => {
                                const text = `${item.title} ${item.contentSnippet || ""}`.toLowerCase();
                                return keywords.some((keyword) => text.includes(keyword));
                            })
                            .slice(0, 10)
                            .map((item) => ({
                                title: item.title,
                                link: item.link,
                                pubDate: item.pubDate,
                                content: item.contentSnippet || item.content?.substring(0, 500),
                            }));
                        articles.push(...relevantArticles);
                    } catch (err: any) {
                        console.error(`RSS error (${url}):`, err.message);
                    }
                })
            );

            // Google News for specific category - UPDATED search query
            try {
                const searchQuery = `${category} layoffs planned upcoming 2024 2025`;
                const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
                    searchQuery
                )}&hl=en-US&gl=US&ceid=US:en`;
                const feed = await rssParser.parseURL(googleNewsUrl);
                articles.push(
                    ...feed.items.slice(0, 10).map((item) => ({
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        content: item.contentSnippet || "",
                    }))
                );
            } catch (err: any) {
                console.error(`Google News error (${category}):`, err.message);
            }

            // Remove duplicates
            const uniqueArticles: any[] = [];
            const seenUrls = new Set();
            for (const article of articles) {
                if (!seenUrls.has(article.link)) {
                    seenUrls.add(article.link);
                    uniqueArticles.push(article);
                }
            }

            console.log(`✓ Found ${uniqueArticles.length} articles for ${category}`);

            if (uniqueArticles.length === 0) continue;

            // ✅ 3. SCRAPE ARTICLES
            const BATCH_SIZE = 5;
            const articlesToScrape = uniqueArticles.slice(0, 15);
            const scrapedArticles: any[] = [];

            for (let i = 0; i < articlesToScrape.length; i += BATCH_SIZE) {
                const batch = articlesToScrape.slice(i, i + BATCH_SIZE);

                await Promise.all(
                    batch.map(async (article) => {
                        try {
                            const scrapingDogUrl = `https://api.scrapingdog.com/scrape?api_key=${SCRAPINGDOG_API_KEY}&url=${encodeURIComponent(
                                article.link
                            )}&dynamic=false`;
                            const response = await fetch(scrapingDogUrl, { signal: AbortSignal.timeout(6000) });

                            if (response.ok) {
                                const html = await response.text();
                                const textContent = html
                                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
                                    .replace(/<[^>]+>/g, " ")
                                    .replace(/\s+/g, " ")
                                    .trim()
                                    .substring(0, 4000);

                                scrapedArticles.push({
                                    title: article.title,
                                    link: article.link,
                                    pubDate: article.pubDate,
                                    fullContent: textContent,
                                });
                            } else {
                                scrapedArticles.push(article);
                            }
                        } catch (err) {
                            scrapedArticles.push(article);
                        }
                    })
                );
            }

            // ✅ 4. CLAUDE EXTRACTION - UPDATED PROMPT
            if (scrapedArticles.length > 0) {
                console.log(`Extracting ${category} layoff data with AI...`);
                const CLAUDE_BATCH_SIZE = 10;

                for (let i = 0; i < scrapedArticles.length; i += CLAUDE_BATCH_SIZE) {
                    const batch = scrapedArticles.slice(i, i + CLAUDE_BATCH_SIZE);

                    const categoryContext = `Focus specifically on ${category} industry layoffs. Classify layoffs as "${category}" industry.`;

                    // UPDATED PROMPT - Better handling of upcoming layoffs
                    const prompt = `You are a data extraction AI. ${categoryContext}

Extract ALL confirmed AND upcoming/planned layoff events from 2024, 2025, and 2026 from the articles below.

CRITICAL RULES FOR UPCOMING LAYOFFS:
1. If article mentions "plans to lay off", "will cut", "announcing layoffs", "expected to cut" - these are UPCOMING layoffs
2. For upcoming layoffs where no specific date is mentioned:
   - If article mentions "Q1", "Q2", etc., use the middle of that quarter
   - If article mentions "by end of year", use December 31 of that year
   - If article mentions "next few months", add 2-3 months to article date
   - If no timeline given, use article publication date + 1 month as estimated date
3. Set "is_upcoming" to true for planned/future layoffs, false for completed layoffs
4. In details, clearly indicate if it's "Planned layoff" or "Completed layoff"

GENERAL RULES:
1. Extract EVERY company with layoffs (both completed and upcoming)
2. Include only 2024-2026 layoffs
3. For ranges, use midpoint; for percentages, calculate
4. MUST classify as industry: "${category}"
5. Look for phrases like: "will lay off", "plans to cut", "announcing", "expected to"

OUTPUT: Valid JSON array only. No markdown, no explanations.

[
  {
    "company": "Company Name",
    "date": "YYYY-MM-DD",
    "employees_laid_off": number or null,
    "source": "url",
    "location": "City, State or null",
    "industry": "${category}",
    "details": "Brief summary - mention if planned/upcoming",
    "is_upcoming": true or false
  }
]

Articles:
${JSON.stringify(
                        batch.map((a) => ({
                            title: a.title,
                            date: a.pubDate,
                            url: a.link,
                            content: (a.fullContent || a.content || "").substring(0, 2000),
                        })),
                        null,
                        2
                    )}`;

                    try {
                        const aiResult = await anthropicMessagesCreateWithRetry(
                            anthropic,
                            {
                                model: "claude-sonnet-4-20250514",
                                max_tokens: 8000,
                                temperature: 0,
                                messages: [{ role: "user", content: prompt }],
                            },
                            {
                                maxRetries: 6,
                                baseDelayMs: 2000,
                                label: `layoffs:${category}`,
                            },
                        );

                        if (!aiResult.ok) {
                            console.error(
                                `Claude error (${category}):`,
                                aiResult.error,
                                aiResult.requestId,
                            );
                            continue;
                        }

                        let data = aiResult.message.content[0].text
                            .trim()
                            .replace(/```json\n?/g, "")
                            .replace(/```\n?/g, "")
                            .trim();

                        const jsonMatch = data.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            const extractedLayoffs = JSON.parse(jsonMatch[0]);
                            if (Array.isArray(extractedLayoffs)) {
                                allLayoffs.push(...extractedLayoffs);
                                console.log(`✓ Extracted ${extractedLayoffs.length} layoffs from ${category}`);
                            }
                        }
                    } catch (err) {
                        console.error(`Claude error (${category}):`, err);
                    }
                }
            }
        }

        // ✅ 5. FILTER AND DEDUPLICATE - UPDATED to allow future dates
        let filteredLayoffs = allLayoffs.filter((layoff) => {
            if (!layoff.date) return false;
            const layoffDate = new Date(layoff.date);
            const year = layoffDate.getFullYear();

            // Accept dates from 2024 through 2026
            if (year < 2024 || year > 2026) return false;

            // Allow upcoming layoffs (future dates)
            // But reject dates that are too far in the future (beyond 2026)
            const maxDate = new Date('2026-12-31');
            return layoffDate <= maxDate;
        });

        const uniqueLayoffs: LayoffData[] = [];
        const seen = new Set();
        for (const layoff of filteredLayoffs) {
            const key = `${layoff.company.toLowerCase().trim()}-${layoff.date}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueLayoffs.push(layoff);
            }
        }

        console.log(`\n📊 Found ${uniqueLayoffs.length} unique layoffs across all industries`);

        // Show breakdown by industry
        const industryBreakdown = uniqueLayoffs.reduce((acc, l) => {
            acc[l.industry] = (acc[l.industry] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log("Industry breakdown:", industryBreakdown);

        // Show upcoming vs completed breakdown
        const upcomingCount = uniqueLayoffs.filter(l => l.is_upcoming).length;
        const completedCount = uniqueLayoffs.length - upcomingCount;
        console.log(`Upcoming: ${upcomingCount}, Completed: ${completedCount}`);

        // ✅ 6. SAVE ONLY NEW ENTRIES TO DATABASE
        let newCount = 0;
        let skippedCount = 0;

        for (const layoff of uniqueLayoffs) {
            try {
                // Check if layoff already exists in database
                const existing = await db
                    .select()
                    .from(layoffs)
                    .where(
                        and(
                            eq(layoffs.company, layoff.company),
                            eq(layoffs.date, new Date(layoff.date))
                        )
                    )
                    .limit(1);

                if (existing.length === 0) {
                    // Insert new layoff
                    await db.insert(layoffs).values({
                        company: layoff.company,
                        date: new Date(layoff.date),
                        employeesLaidOff: layoff.employees_laid_off,
                        source: layoff.source,
                        location: layoff.location,
                        industry: layoff.industry,
                        details: layoff.details,
                        // Add is_upcoming to your schema if not present
                        // isUpcoming: layoff.is_upcoming || false,
                    });
                    newCount++;
                } else {
                    skippedCount++;
                }
            } catch (err: any) {
                console.error(`Error saving layoff for ${layoff.company}:`, err.message);
            }
        }

        console.log(`\n✅ COMPLETED: ${newCount} new entries saved, ${skippedCount} duplicates skipped`);
    } catch (error: any) {
        console.error("Error in fetchAndSaveLayoffs:", error.message);
    } finally {
        isRunning = false;
    }
}

// Schedule job to run every hour
function startScheduler() {
    // Defer first run so dev uploads (resume, etc.) are less likely to race Anthropic with this heavy job
    const initialDelayMs = 120_000;
    console.log(
        `🚀 Layoff fetch scheduled in ${initialDelayMs / 1000}s (avoids clashing with API traffic on boot)…`,
    );
    setTimeout(() => {
        void fetchAndSaveLayoffs();
    }, initialDelayMs);

    // Schedule to run every hour at minute 0
    scheduleJob("0 */6 * * *", async () => {
        console.log(`\n⏰ [${new Date().toISOString()}] Hourly job triggered`);
        await fetchAndSaveLayoffs();
    });

    console.log("✅ Scheduler initialized - will run every hour");
}

// Start the scheduler
startScheduler();

export default router;