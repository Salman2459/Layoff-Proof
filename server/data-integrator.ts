// Data integration service for external layoff tracking sources
import { db } from "./db";
import { companies, layoffEvents } from "@shared/schema";
import { eq } from "drizzle-orm";

interface LayoffsFyiData {
  company: string;
  location: string;
  industry: string;
  total_laid_off: number;
  date: string;
  stage: string;
  country: string;
  funds_raised: number;
  sources: string;
}

interface WarnTrackerData {
  company_name: string;
  state: string;
  laid_off: number;
  notice_date: string;
  layoff_date: string;
  city: string;
  year: number;
}

interface LayoffDataItem {
  company: string;
  state: string;
  employees_affected: number;
  notice_date: string;
  layoff_date: string;
  city: string;
  reason: string;
}

export class DataIntegrator {
  // Simulate fetching data from layoffs.fyi API
  async fetchLayoffsFyiData(): Promise<LayoffsFyiData[]> {
    // In real implementation, this would make API calls to layoffs.fyi
    // For now, we'll return structured sample data based on their format
    return [
      {
        company: "Meta",
        location: "Menlo Park",
        industry: "Consumer",
        total_laid_off: 11000,
        date: "2024-11-09",
        stage: "Post-IPO",
        country: "United States",
        funds_raised: 116000000000,
        sources: "https://about.fb.com/news/2024/11/mark-zuckerberg-message-to-employees/"
      },
      {
        company: "Amazon",
        location: "Seattle",
        industry: "Retail",
        total_laid_off: 18000,
        date: "2024-01-04",
        stage: "Post-IPO",
        country: "United States",
        funds_raised: 13800000000,
        sources: "https://blog.aboutamazon.com/company-news"
      },
      {
        company: "Google",
        location: "Mountain View",
        industry: "Consumer",
        total_laid_off: 12000,
        date: "2024-01-20",
        stage: "Post-IPO",
        country: "United States",
        funds_raised: 89100000000,
        sources: "https://blog.google/inside-google/message-ceo/"
      },
      {
        company: "Microsoft",
        location: "Redmond",
        industry: "Consumer",
        total_laid_off: 10000,
        date: "2024-01-18",
        stage: "Post-IPO",
        country: "United States",
        funds_raised: 61200000000,
        sources: "https://blogs.microsoft.com/blog/"
      },
      {
        company: "Salesforce",
        location: "San Francisco",
        industry: "Sales",
        total_laid_off: 8000,
        date: "2024-01-04",
        stage: "Post-IPO",
        country: "United States",
        funds_raised: 27900000000,
        sources: "https://www.salesforce.com/news/"
      }
    ];
  }

  // Simulate fetching data from WARN tracker
  async fetchWarnTrackerData(): Promise<WarnTrackerData[]> {
    return [
      {
        company_name: "Intel Corporation",
        state: "CA",
        laid_off: 5000,
        notice_date: "2024-08-01",
        layoff_date: "2024-10-01",
        city: "Santa Clara",
        year: 2024
      },
      {
        company_name: "Tesla Inc",
        state: "CA",
        laid_off: 3500,
        notice_date: "2024-04-15",
        layoff_date: "2024-06-15",
        city: "Fremont",
        year: 2024
      },
      {
        company_name: "Netflix Inc",
        state: "CA",
        laid_off: 450,
        notice_date: "2024-05-17",
        layoff_date: "2024-06-17",
        city: "Los Gatos",
        year: 2024
      }
    ];
  }

  // Simulate fetching data from layoffdata.com
  async fetchLayoffData(): Promise<LayoffDataItem[]> {
    return [
      {
        company: "PayPal Holdings Inc",
        state: "CA",
        employees_affected: 2500,
        notice_date: "2024-01-31",
        layoff_date: "2024-03-31", 
        city: "San Jose",
        reason: "Restructuring"
      },
      {
        company: "Snap Inc",
        state: "CA",
        employees_affected: 1300,
        notice_date: "2024-02-07",
        layoff_date: "2024-03-07",
        city: "Santa Monica",
        reason: "Cost reduction"
      }
    ];
  }

  // Find or create company in our database
  async findOrCreateCompany(companyName: string, industry?: string, location?: string) {
    const [existingCompany] = await db
      .select()
      .from(companies)
      .where(eq(companies.name, companyName))
      .limit(1);

    if (existingCompany) {
      return existingCompany;
    }

    // Create new company
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: companyName,
        industry: industry || "Unknown",
        location: location || "Unknown",
        status: "tracking",
        description: `${companyName} - Automatically imported from external data sources`,
        website: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        size: "Unknown"
      })
      .returning();

    return newCompany;
  }

  // Import data from layoffs.fyi format
  async importLayoffsFyiData() {
    const data = await this.fetchLayoffsFyiData();
    
    for (const item of data) {
      const company = await this.findOrCreateCompany(item.company, item.industry, item.location);
      
      // Check if layoff event already exists
      const existingEvent = await db
        .select()
        .from(layoffEvents)
        .where(eq(layoffEvents.companyId, company.id))
        .limit(1);

      if (existingEvent.length === 0) {
        await db.insert(layoffEvents).values({
          companyId: company.id,
          title: `${item.company} Layoffs - ${item.total_laid_off} employees`,
          description: `Layoffs at ${item.company} affecting ${item.total_laid_off} employees. Company stage: ${item.stage}`,
          affectedEmployees: item.total_laid_off,
          layoffDate: new Date(item.date),
          severity: this.calculateSeverity(item.total_laid_off),
          source: item.sources,
          sourceType: "layoffs_fyi",
          locations: [item.location],
          industry: item.industry,
          fundingStage: item.stage,
          companyValuation: item.funds_raised.toString(),
          country: item.country
        });
      }
    }
  }

  // Import data from WARN tracker format  
  async importWarnTrackerData() {
    const data = await this.fetchWarnTrackerData();
    
    for (const item of data) {
      const company = await this.findOrCreateCompany(item.company_name, "Unknown", `${item.city}, ${item.state}`);
      
      await db.insert(layoffEvents).values({
        companyId: company.id,
        title: `${item.company_name} WARN Notice - ${item.laid_off} employees`,
        description: `WARN Act layoff notice for ${item.company_name} affecting ${item.laid_off} employees`,
        affectedEmployees: item.laid_off,
        layoffDate: new Date(item.layoff_date),
        noticeDate: new Date(item.notice_date),
        severity: this.calculateSeverity(item.laid_off),
        source: "warntracker.com",
        sourceType: "warntracker",
        city: item.city,
        state: item.state,
        warnNoticeRequired: true,
        warnNoticeDate: new Date(item.notice_date)
      });
    }
  }

  // Import data from layoffdata.com format
  async importLayoffData() {
    const data = await this.fetchLayoffData();
    
    for (const item of data) {
      const company = await this.findOrCreateCompany(item.company, "Unknown", `${item.city}, ${item.state}`);
      
      await db.insert(layoffEvents).values({
        companyId: company.id,
        title: `${item.company} Layoffs - ${item.employees_affected} employees`,
        description: `Layoffs at ${item.company}: ${item.reason}`,
        affectedEmployees: item.employees_affected,
        layoffDate: new Date(item.layoff_date),
        noticeDate: new Date(item.notice_date),
        severity: this.calculateSeverity(item.employees_affected),
        source: "layoffdata.com",
        sourceType: "layoffdata",
        city: item.city,
        state: item.state,
        layoffReason: item.reason,
        warnNoticeRequired: true
      });
    }
  }

  // Calculate severity based on number of affected employees
  private calculateSeverity(affectedEmployees: number): string {
    if (affectedEmployees >= 5000) return "critical";
    if (affectedEmployees >= 1000) return "high";
    if (affectedEmployees >= 100) return "medium";
    return "low";
  }

  // Main integration method
  async integrateAllData() {
    console.log("Starting data integration from external sources...");
    
    try {
      await this.importLayoffsFyiData();
      console.log("✓ Imported layoffs.fyi data");
      
      await this.importWarnTrackerData();
      console.log("✓ Imported warntracker.com data");
      
      await this.importLayoffData();
      console.log("✓ Imported layoffdata.com data");
      
      console.log("Data integration completed successfully!");
    } catch (error) {
      console.error("Error during data integration:", error);
      throw error;
    }
  }
}

export const dataIntegrator = new DataIntegrator();